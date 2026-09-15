using Anything.Contracts.Notifications;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Queries;

public record GetUnreadNotificationCountQuery(int UserId) : IRequest<UnreadNotificationCountResponse>;

public class GetUnreadNotificationCountHandler(IRepository<Notification> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetUnreadNotificationCountQuery, UnreadNotificationCountResponse>
{
    public async Task<UnreadNotificationCountResponse> Handle(GetUnreadNotificationCountQuery query, CancellationToken ct = default)
    {
        var count = await repository.Query().AsNoTracking()
            .CountAsync(n => n.HouseholdId == householdContext.HouseholdId
                             && n.UserId == query.UserId
                             && n.DeletedOn == null
                             && n.ReadOn == null, ct);

        return new UnreadNotificationCountResponse(count);
    }
}
