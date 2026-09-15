using Anything.Contracts.Notifications;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Queries;

/// <summary>
/// The signed-in user's inbox for the current household, newest first.
/// <paramref name="Limit"/> caps the page for the header popover; the list page
/// omits it and gets <see cref="GetNotificationsHandler.MaxResults"/> at most.
/// </summary>
public record GetNotificationsQuery(int UserId, bool UnreadOnly = false, int? Limit = null)
    : IRequest<List<NotificationResponse>>;

public class GetNotificationsHandler(IRepository<Notification> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetNotificationsQuery, List<NotificationResponse>>
{
    /// <summary>
    /// Hard ceiling on one page. An inbox grows without bound and nothing else
    /// trims it yet, so an unbounded list query would eventually ship a user's
    /// whole history on every page load.
    /// </summary>
    public const int MaxResults = 100;

    public async Task<List<NotificationResponse>> Handle(GetNotificationsQuery query, CancellationToken ct = default)
    {
        var notifications = repository.Query().AsNoTracking()
            .Where(n => n.HouseholdId == householdContext.HouseholdId
                        && n.UserId == query.UserId
                        && n.DeletedOn == null);

        if (query.UnreadOnly)
            notifications = notifications.Where(n => n.ReadOn == null);

        var take = query.Limit is > 0 ? Math.Min(query.Limit.Value, MaxResults) : MaxResults;

        return await notifications
            .OrderByDescending(n => n.CreatedOn)
            .ThenByDescending(n => n.Id)
            .Take(take)
            .Select(n => new NotificationResponse(
                n.Id, n.Category, n.Title, n.Body, n.LinkUrl, n.CreatedOn, n.ReadOn))
            .ToListAsync(ct);
    }
}
