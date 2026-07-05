using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanSettingsCommand(
    int ActiveDays,
    int? SuggestionRotationWeight = null,
    int? SuggestionFavoritesWeight = null,
    int? SuggestionSeasonalityWeight = null,
    int? SuggestionExclusionWindowDays = null,
    int? SuggestionRotationSaturationDays = null,
    int? SuggestionSeasonalityWindowDays = null) : IRequest<IResult>;

public class UpdateFoodPlanSettingsHandler(
    IRepository<FoodPlanSettings> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanSettingsCommand, IResult>
{
    public async Task<IResult> Handle(UpdateFoodPlanSettingsCommand command, CancellationToken ct = default)
    {
        var settings = await repository.Query()
            .FirstOrDefaultAsync(s => s.HouseholdId == householdContext.HouseholdId, ct);
        if (settings is null)
        {
            settings = new FoodPlanSettings
            {
                HouseholdId = householdContext.HouseholdId,
                CreatedOn = timeProvider.GetUtcNow().UtcDateTime
            };
            repository.Add(settings);
        }
        else
        {
            settings.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
            repository.Update(settings);
        }

        settings.ActiveDays = command.ActiveDays;
        if (command.SuggestionRotationWeight.HasValue)
            settings.SuggestionRotationWeight = command.SuggestionRotationWeight.Value;
        if (command.SuggestionFavoritesWeight.HasValue)
            settings.SuggestionFavoritesWeight = command.SuggestionFavoritesWeight.Value;
        if (command.SuggestionSeasonalityWeight.HasValue)
            settings.SuggestionSeasonalityWeight = command.SuggestionSeasonalityWeight.Value;
        if (command.SuggestionExclusionWindowDays.HasValue)
            settings.SuggestionExclusionWindowDays = command.SuggestionExclusionWindowDays.Value;
        if (command.SuggestionRotationSaturationDays.HasValue)
            settings.SuggestionRotationSaturationDays = command.SuggestionRotationSaturationDays.Value;
        if (command.SuggestionSeasonalityWindowDays.HasValue)
            settings.SuggestionSeasonalityWindowDays = command.SuggestionSeasonalityWindowDays.Value;

        await unitOfWork.SaveChanges(ct);
        return Results.Ok(settings);
    }
}
