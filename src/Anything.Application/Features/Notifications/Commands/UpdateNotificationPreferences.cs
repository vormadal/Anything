using Anything.Contracts.Notifications;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notifications.Commands;

public record UpdateNotificationPreferencesCommand(int UserId, List<NotificationPreferenceItem> Preferences)
    : IRequest<IResult>;

public class UpdateNotificationPreferencesHandler(
    IRepository<NotificationPreference> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateNotificationPreferencesCommand, IResult>
{
    public async Task<IResult> Handle(UpdateNotificationPreferencesCommand command, CancellationToken ct = default)
    {
        // An unknown category would be a row nothing ever reads — and silently
        // storing one hides a client/server mismatch, so reject instead.
        var unknown = command.Preferences
            .Select(p => p.Category)
            .Where(c => !NotificationCategories.IsKnown(c))
            .Distinct()
            .ToList();

        if (unknown.Count > 0)
            return Results.BadRequest($"Unknown notification categories: {string.Join(", ", unknown)}.");

        var existing = await repository.Query()
            .Where(p => p.HouseholdId == householdContext.HouseholdId && p.UserId == command.UserId)
            .ToListAsync(ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var item in command.Preferences)
        {
            var preference = existing.FirstOrDefault(p => p.Category == item.Category);
            if (preference is null)
            {
                repository.Add(new NotificationPreference
                {
                    HouseholdId = householdContext.HouseholdId,
                    UserId = command.UserId,
                    Category = item.Category,
                    InAppEnabled = item.InAppEnabled,
                    CreatedOn = now
                });
            }
            else if (preference.InAppEnabled != item.InAppEnabled)
            {
                preference.InAppEnabled = item.InAppEnabled;
                preference.ModifiedOn = now;
                repository.Update(preference);
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
