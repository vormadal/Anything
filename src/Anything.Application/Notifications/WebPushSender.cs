using System.Net;
using System.Text.Json;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Lib.Net.Http.WebPush;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LibPushSubscription = Lib.Net.Http.WebPush.PushSubscription;

namespace Anything.Application.Notifications;

public class WebPushSender(
    PushServiceClient pushClient,
    VapidCredentials credentials,
    IRepository<PushDevice> deviceRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    ILogger<WebPushSender> logger) : IPushSender
{
    /// <summary>
    /// How long a push service should hold an undelivered message. A day: long
    /// enough to reach a phone that was off overnight, short enough that a
    /// week-old "bin day moved" never surfaces.
    /// </summary>
    private static readonly TimeSpan MessageTimeToLive = TimeSpan.FromDays(1);

    private static readonly JsonSerializerOptions PayloadOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task Send(PushDispatch dispatch, CancellationToken ct = default)
    {
        if (credentials.Authentication is not { } authentication)
            return;

        var userIds = dispatch.UserIds.ToList();
        if (userIds.Count == 0)
            return;

        var devices = await deviceRepository.Query()
            .Where(d => d.DeletedOn == null && userIds.Contains(d.UserId))
            .ToListAsync(ct);

        if (devices.Count == 0)
            return;

        var payload = JsonSerializer.Serialize(
            new PushPayload(dispatch.Title, dispatch.Body, dispatch.LinkUrl), PayloadOptions);

        var expired = new List<PushDevice>();

        foreach (var device in devices)
        {
            var message = new PushMessage(payload)
            {
                TimeToLive = (int)MessageTimeToLive.TotalSeconds,
                Urgency = PushMessageUrgency.Normal
            };

            try
            {
                await pushClient.RequestPushMessageDeliveryAsync(ToSubscription(device), message, authentication, ct);
            }
            catch (PushServiceClientException ex) when (IsGone(ex.StatusCode))
            {
                // The browser dropped this subscription — the endpoint is dead
                // for good, so stop trying rather than failing forever.
                expired.Add(device);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Anything else (a transient 5xx, a timeout) is not this
                // notification's problem to solve: the in-app copy is already
                // stored, and there is no retry queue by design.
                logger.LogWarning(ex, "Push delivery failed for device {DeviceId}", device.Id);
            }
        }

        await PruneExpired(expired, ct);
    }

    /// <summary>
    /// 404 and 410 are the two the spec defines as permanent: the endpoint no
    /// longer exists. Everything else may succeed later.
    /// <para>
    /// Internal rather than private so the unit tests can assert the full
    /// status-code range directly, alongside the send-path tests that drive
    /// this for real through a stubbed transport. Which codes are fatal is what
    /// decides whether a device is deleted, so it is worth pinning down twice.
    /// </para>
    /// </summary>
    internal static bool IsGone(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone;

    private static LibPushSubscription ToSubscription(PushDevice device)
    {
        var subscription = new LibPushSubscription { Endpoint = device.Endpoint };
        subscription.SetKey(PushEncryptionKeyName.P256DH, device.P256dhKey);
        subscription.SetKey(PushEncryptionKeyName.Auth, device.AuthKey);
        return subscription;
    }

    private async Task PruneExpired(List<PushDevice> expired, CancellationToken ct)
    {
        if (expired.Count == 0)
            return;

        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var device in expired)
        {
            device.DeletedOn = now;
            deviceRepository.Update(device);
        }

        await unitOfWork.SaveChanges(ct);
        logger.LogInformation("Pruned {Count} expired push device(s)", expired.Count);
    }

    /// <summary>
    /// What the service worker's `push` handler reads. Kept to three fields on
    /// purpose — a push payload travels through a third-party service, so it
    /// carries only what the notification already shows in the app.
    /// </summary>
    private sealed record PushPayload(string Title, string? Body, string? Url);
}
