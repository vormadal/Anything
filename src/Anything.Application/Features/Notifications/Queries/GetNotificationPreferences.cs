using Anything.Contracts.Notifications;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Queries;

public record GetNotificationPreferencesQuery(int UserId) : IRequest<List<NotificationPreferenceResponse>>;

public class GetNotificationPreferencesHandler(
    IRepository<NotificationPreference> repository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetNotificationPreferencesQuery, List<NotificationPreferenceResponse>>
{
    public async Task<List<NotificationPreferenceResponse>> Handle(GetNotificationPreferencesQuery query, CancellationToken ct = default)
    {
        var stored = await repository.Query().AsNoTracking()
            .Where(p => p.HouseholdId == householdContext.HouseholdId && p.UserId == query.UserId)
            .ToListAsync(ct);

        // Always answers with every known category in its canonical order, so the
        // settings page never has to know that an unsaved category means "on".
        // Stored rows for categories no longer in NotificationCategories.All are
        // ignored rather than returned — a retired category isn't a setting.
        return NotificationCategories.All
            .Select(category =>
            {
                var preference = stored.FirstOrDefault(p => p.Category == category);
                return new NotificationPreferenceResponse(
                    category,
                    preference?.InAppEnabled ?? true,
                    preference?.PushEnabled ?? true);
            })
            .ToList();
    }
}
