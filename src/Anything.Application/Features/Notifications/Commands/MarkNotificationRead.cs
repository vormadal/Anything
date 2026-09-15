using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record MarkNotificationReadCommand(int UserId, int Id) : IRequest<IResult>;

public class MarkNotificationReadHandler(
    IRepository<Notification> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<MarkNotificationReadCommand, IResult>
{
    public async Task<IResult> Handle(MarkNotificationReadCommand command, CancellationToken ct = default)
    {
        // Scoped to the recipient as well as the household: another member's
        // notification must read as absent, not as forbidden.
        var notification = await repository.Query()
            .Where(n => n.Id == command.Id
                        && n.HouseholdId == householdContext.HouseholdId
                        && n.UserId == command.UserId
                        && n.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (notification is null)
            return Results.NotFound();

        // Already-read stays at its original timestamp — re-reading isn't an event.
        if (notification.ReadOn is null)
        {
            notification.ReadOn = timeProvider.GetUtcNow().UtcDateTime;
            repository.Update(notification);
            await unitOfWork.SaveChanges(ct);
        }

        return Results.NoContent();
    }
}
