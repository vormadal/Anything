using Anything.Application.Notifications;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record RegisterPushDeviceCommand(
    int UserId,
    string Endpoint,
    string P256dhKey,
    string AuthKey,
    string? UserAgent) : IRequest<IResult>;

public class RegisterPushDeviceHandler(
    IRepository<PushDevice> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    VapidCredentials credentials) : IRequestHandler<RegisterPushDeviceCommand, IResult>
{
    public async Task<IResult> Handle(RegisterPushDeviceCommand command, CancellationToken ct = default)
    {
        // Registering against a deployment with no keys would store a device
        // nothing can ever send to, so say so instead of accepting silently.
        if (!credentials.IsConfigured)
            return Results.Problem(
                "Push notifications are not configured on this server.",
                statusCode: StatusCodes.Status503ServiceUnavailable);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        // Matched on endpoint alone, including soft-deleted and other users'
        // rows: the endpoint is unique per browser, so finding one that belongs
        // to someone else means the browser changed hands and the row must move
        // with it rather than collide with the unique index.
        var existing = await repository.Query()
            .Where(d => d.Endpoint == command.Endpoint)
            .FirstOrDefaultAsync(ct);

        if (existing is null)
        {
            repository.Add(new PushDevice
            {
                UserId = command.UserId,
                Endpoint = command.Endpoint,
                P256dhKey = command.P256dhKey,
                AuthKey = command.AuthKey,
                UserAgent = command.UserAgent,
                CreatedOn = now,
                LastSeenOn = now
            });
        }
        else
        {
            existing.UserId = command.UserId;
            existing.P256dhKey = command.P256dhKey;
            existing.AuthKey = command.AuthKey;
            existing.UserAgent = command.UserAgent;
            existing.LastSeenOn = now;
            // Re-subscribing revives a device that was pruned or unsubscribed.
            existing.DeletedOn = null;
            repository.Update(existing);
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
