using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Notifications;

public class NotificationDispatcher(
    IRepository<Notification> notificationRepository,
    IRepository<NotificationPreference> preferenceRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier,
    IPushDispatchQueue pushQueue,
    VapidCredentials pushCredentials) : INotificationDispatcher
{
    public async Task<int> Dispatch(NotificationDispatch dispatch, CancellationToken ct = default)
    {
        var recipients = await ResolveRecipients(dispatch, ct);
        if (recipients.Count == 0)
            return 0;

        recipients = await RemoveOptedOut(dispatch, recipients, ct);
        if (recipients.Count == 0)
            return 0;

        recipients = await RemoveAlreadyDispatched(dispatch, recipients, ct);
        if (recipients.Count == 0)
            return 0;

        var now = timeProvider.GetUtcNow().UtcDateTime;
        // Materialised: AddRange must not receive a lazily-projected sequence
        // that a caller (or a test double) could enumerate more than once.
        notificationRepository.AddRange(recipients.Select(userId => new Notification
        {
            HouseholdId = dispatch.HouseholdId,
            UserId = userId,
            Category = dispatch.Category,
            Title = dispatch.Title,
            Body = dispatch.Body,
            LinkUrl = dispatch.LinkUrl,
            SourceKey = dispatch.SourceKey,
            CreatedByUserId = dispatch.CreatedByUserId,
            CreatedOn = now
        }).ToList());

        await unitOfWork.SaveChanges(ct);

        // Contentless on purpose: SSE connections are household-scoped, not
        // per-user (see SseConnectionManager), so every member's client gets this
        // and refetches its own inbox. Nothing about one member's notifications
        // travels to another.
        await realtimeNotifier.Notify(SyncEvent.Notifications(), dispatch.HouseholdId, ct);

        await EnqueuePush(dispatch, recipients, ct);

        return recipients.Count;
    }

    private async Task<List<int>> ResolveRecipients(NotificationDispatch dispatch, CancellationToken ct)
    {
        var members = memberRepository.Query().AsNoTracking()
            .Where(m => m.HouseholdId == dispatch.HouseholdId);

        if (dispatch.RecipientUserIds is { } requested)
        {
            // Explicit recipients are still constrained to the household — a
            // caller can't address someone outside it. Materialised to List<int>
            // because that's what EF translates to `= ANY(@ids)` reliably.
            var requestedIds = requested.ToList();
            members = members.Where(m => requestedIds.Contains(m.UserId));
        }

        var recipients = await members.Select(m => m.UserId).ToListAsync(ct);

        return recipients
            .Where(id => id != dispatch.ExcludeUserId)
            .Distinct()
            .ToList();
    }

    /// <summary>
    /// Queues the same notification as a device nudge for the recipients who
    /// want one. Push is a strict narrowing of in-app: these recipients already
    /// survived the InAppEnabled filter, so a row exists for each — PushEnabled
    /// only decides whether their devices also light up. Queued, never awaited
    /// against the push service, so this adds nothing to the caller's latency.
    /// </summary>
    private async Task EnqueuePush(NotificationDispatch dispatch, List<int> recipients, CancellationToken ct)
    {
        // Deployments without VAPID keys are the default, and on those the
        // opt-out lookup below would run on every single dispatch only to feed
        // a queue whose sender returns immediately. Ask the cheap question first.
        if (!pushCredentials.IsConfigured)
            return;

        var pushOptedOut = await preferenceRepository.Query().AsNoTracking()
            .Where(p => p.HouseholdId == dispatch.HouseholdId
                        && p.Category == dispatch.Category
                        && !p.PushEnabled
                        && recipients.Contains(p.UserId))
            .Select(p => p.UserId)
            .ToListAsync(ct);

        var pushRecipients = pushOptedOut.Count == 0
            ? recipients
            : recipients.Except(pushOptedOut).ToList();

        if (pushRecipients.Count == 0)
            return;

        pushQueue.TryEnqueue(new PushDispatch
        {
            UserIds = pushRecipients,
            Title = dispatch.Title,
            Body = dispatch.Body,
            LinkUrl = dispatch.LinkUrl
        });
    }

    private async Task<List<int>> RemoveOptedOut(NotificationDispatch dispatch, List<int> recipients, CancellationToken ct)
    {
        // Absent row means enabled, so only explicit opt-outs need loading.
        var optedOut = await preferenceRepository.Query().AsNoTracking()
            .Where(p => p.HouseholdId == dispatch.HouseholdId
                        && p.Category == dispatch.Category
                        && !p.InAppEnabled
                        && recipients.Contains(p.UserId))
            .Select(p => p.UserId)
            .ToListAsync(ct);

        return optedOut.Count == 0
            ? recipients
            : recipients.Except(optedOut).ToList();
    }

    private async Task<List<int>> RemoveAlreadyDispatched(NotificationDispatch dispatch, List<int> recipients, CancellationToken ct)
    {
        if (dispatch.SourceKey is null)
            return recipients;

        // Matches the unique index exactly — which spans neither HouseholdId nor
        // DeletedOn, so neither may be filtered here or a "new" row could still
        // collide. Recipients are already household-scoped by ResolveRecipients,
        // so reading across households leaks nothing.
        //
        // Deliberately not filtered by DeletedOn: the unique index covers
        // soft-deleted rows too, so treating a dismissed notification as absent
        // would turn a redelivery into a constraint violation — and re-sending
        // something the user already dismissed is the wrong behaviour anyway.
        var existing = await notificationRepository.Query().AsNoTracking()
            .Where(n => n.Category == dispatch.Category
                        && n.SourceKey == dispatch.SourceKey
                        && recipients.Contains(n.UserId))
            .Select(n => n.UserId)
            .ToListAsync(ct);

        return existing.Count == 0
            ? recipients
            : recipients.Except(existing).ToList();
    }
}
