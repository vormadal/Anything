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
                // A switch the caller omitted keeps the entity's default (on),
                // so a first-ever write of one switch doesn't silently turn the
                // other off.
                repository.Add(new NotificationPreference
                {
                    HouseholdId = householdContext.HouseholdId,
                    UserId = command.UserId,
                    Category = item.Category,
                    InAppEnabled = item.InAppEnabled ?? true,
                    PushEnabled = item.PushEnabled ?? true,
                    CreatedOn = now
                });
                continue;
            }

            var changed = false;

            if (item.InAppEnabled is { } inApp && preference.InAppEnabled != inApp)
            {
                preference.InAppEnabled = inApp;
                changed = true;
            }

            if (item.PushEnabled is { } push && preference.PushEnabled != push)
            {
                preference.PushEnabled = push;
                changed = true;
            }

            if (changed)
            {
                preference.ModifiedOn = now;
                repository.Update(preference);
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
