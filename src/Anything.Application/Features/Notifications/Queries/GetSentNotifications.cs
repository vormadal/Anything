using Anything.Contracts.Notifications;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Queries;

/// <summary>
/// What the signed-in user has sent into the current household, newest first.
/// The inverse of <see cref="GetNotificationsQuery"/>: that one reads by
/// recipient, this one by author.
/// </summary>
public record GetSentNotificationsQuery(int UserId, int? Limit = null)
    : IRequest<List<SentNotificationResponse>>;

public class GetSentNotificationsHandler(IRepository<Notification> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetSentNotificationsQuery, List<SentNotificationResponse>>
{
    /// <summary>
    /// Sends, not rows — a single announcement to a large household is one entry
    /// here and many there. Same reasoning as
    /// <see cref="GetNotificationsHandler.MaxResults"/>: nothing trims history.
    /// </summary>
    public const int MaxResults = 100;

    public async Task<List<SentNotificationResponse>> Handle(
        GetSentNotificationsQuery query, CancellationToken ct = default)
    {
        var take = query.Limit is > 0 ? Math.Min(query.Limit.Value, MaxResults) : MaxResults;

        // Deliberately no DeletedOn filter: a recipient dismissing their copy is
        // not an unsend, and dropping those rows would silently shrink the
        // recipient count of an announcement that really did go out.
        return await repository.Query().AsNoTracking()
            .Where(n => n.HouseholdId == householdContext.HouseholdId
                        && n.CreatedByUserId == query.UserId)
            // One dispatch stamps every copy with the same CreatedOn (see
            // NotificationDispatcher), so this reassembles exactly the rows one
            // send produced. Title/Body/Category are in the key only to keep two
            // sends that somehow share a timestamp apart.
            .GroupBy(n => new { n.CreatedOn, n.Category, n.Title, n.Body })
            .OrderByDescending(g => g.Key.CreatedOn)
            .Select(g => new SentNotificationResponse(
                g.Key.Category,
                g.Key.Title,
                g.Key.Body,
                g.Key.CreatedOn,
                g.Count(),
                // Sum-of-conditional rather than Count(predicate): it is the
                // form EF translates to a plain SUM(CASE ...) on every provider.
                g.Sum(n => n.ReadOn == null ? 0 : 1)))
            .Take(take)
            .ToListAsync(ct);
    }
}
