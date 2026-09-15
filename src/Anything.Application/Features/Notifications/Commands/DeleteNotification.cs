using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record DeleteNotificationCommand(int UserId, int Id) : IRequest<IResult>;

public class DeleteNotificationHandler(
    IRepository<Notification> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteNotificationCommand, IResult>
{
    public async Task<IResult> Handle(DeleteNotificationCommand command, CancellationToken ct = default)
    {
        var notification = await repository.Query()
            .Where(n => n.Id == command.Id
                        && n.HouseholdId == householdContext.HouseholdId
                        && n.UserId == command.UserId
                        && n.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (notification is null)
            return Results.NotFound();

        // Soft delete, per the app's convention — and here it also keeps the
        // row visible to the dispatcher's SourceKey check, so dismissing a
        // notification isn't an invitation to redeliver it.
        notification.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        repository.Update(notification);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
