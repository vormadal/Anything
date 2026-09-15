using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record RemovePushDeviceCommand(int UserId, string Endpoint) : IRequest<IResult>;

public class RemovePushDeviceHandler(
    IRepository<PushDevice> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<RemovePushDeviceCommand, IResult>
{
    public async Task<IResult> Handle(RemovePushDeviceCommand command, CancellationToken ct = default)
    {
        // Scoped to the caller: one user must not be able to unsubscribe
        // another's browser by guessing an endpoint.
        var device = await repository.Query()
            .Where(d => d.Endpoint == command.Endpoint
                        && d.UserId == command.UserId
                        && d.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        // Idempotent: unsubscribing a device the server already dropped (say,
        // pruned on a 410) is the state the caller wanted, not an error.
        if (device is null)
            return Results.NoContent();

        device.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        repository.Update(device);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
