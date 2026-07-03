using Anything.Contracts.HomePreferences;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.HomePreferences.Commands;

public record UpdateHomeCardPreferencesCommand(int UserId, List<HomeCardPreferenceItem> Cards) : IRequest<IResult>;

public class UpdateHomeCardPreferencesHandler(
    IRepository<HomeCardPreference> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateHomeCardPreferencesCommand, IResult>
{
    public async Task<IResult> Handle(UpdateHomeCardPreferencesCommand command, CancellationToken ct = default)
    {
        var existing = await repository.Query()
            .Where(p => p.HouseholdId == householdContext.HouseholdId && p.UserId == command.UserId)
            .ToListAsync(ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        for (var i = 0; i < command.Cards.Count; i++)
        {
            var item = command.Cards[i];
            var preference = existing.FirstOrDefault(p => p.CardKey == item.CardKey);
            if (preference is null)
            {
                repository.Add(new HomeCardPreference
                {
                    HouseholdId = householdContext.HouseholdId,
                    UserId = command.UserId,
                    CardKey = item.CardKey,
                    SortOrder = i,
                    IsVisible = item.IsVisible,
                    CreatedOn = now
                });
            }
            else
            {
                preference.SortOrder = i;
                preference.IsVisible = item.IsVisible;
                preference.ModifiedOn = now;
                repository.Update(preference);
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
