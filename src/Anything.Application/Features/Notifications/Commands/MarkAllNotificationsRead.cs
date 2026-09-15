using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record MarkAllNotificationsReadCommand(int UserId) : IRequest<IResult>;

public class MarkAllNotificationsReadHandler(
    IRepository<Notification> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<MarkAllNotificationsReadCommand, IResult>
{
    public async Task<IResult> Handle(MarkAllNotificationsReadCommand command, CancellationToken ct = default)
    {
        var unread = await repository.Query()
            .Where(n => n.HouseholdId == householdContext.HouseholdId
                        && n.UserId == command.UserId
                        && n.DeletedOn == null
                        && n.ReadOn == null)
            .ToListAsync(ct);

        if (unread.Count == 0)
            return Results.NoContent();

        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var notification in unread)
        {
            notification.ReadOn = now;
            repository.Update(notification);
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
