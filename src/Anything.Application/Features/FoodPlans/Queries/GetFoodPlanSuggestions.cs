using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanSuggestionsQuery(DateOnly Date, int Count = 10) : IRequest<List<FoodPlanSuggestionResponse>>;

public class GetFoodPlanSuggestionsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IRepository<RecipeTag> tagRepository,
    IRepository<SeasonalTagRule> ruleRepository,
    IRepository<FoodPlanSettings> settingsRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<GetFoodPlanSuggestionsQuery, List<FoodPlanSuggestionResponse>>
{
    private const int MinCount = 1;
    private const int MaxCount = 50;

    public async Task<List<FoodPlanSuggestionResponse>> Handle(GetFoodPlanSuggestionsQuery query, CancellationToken ct = default)
    {
        var count = Math.Clamp(query.Count, MinCount, MaxCount);

        var rules = await SeasonalTagDefaults.GetOrSeedRules(
            ruleRepository, settingsRepository, householdContext, unitOfWork, timeProvider, ct);

        var settings = await settingsRepository.Query()
            .FirstOrDefaultAsync(s => s.HouseholdId == householdContext.HouseholdId, ct);
        var options = SuggestionScoringOptions.FromSettings(settings);

        var householdRecipes = recipeRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId);

        var recipes = await householdRecipes
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(ct);

        var entries = await entryRepository.Query()
            .Where(e => e.DeletedOn == null && e.HouseholdId == householdContext.HouseholdId && e.RecipeId != null)
            .Select(e => new { e.RecipeId, e.Date })
            .ToListAsync(ct);
        var plannedDatesByRecipe = entries.ToLookup(e => e.RecipeId!.Value, e => DateOnly.FromDateTime(e.Date));

        var tags = await tagRepository.Query()
            .Where(t => t.DeletedOn == null)
            .Join(householdRecipes, t => t.RecipeId, r => r.Id, (t, r) => new { t.RecipeId, t.Name })
            .ToListAsync(ct);
        var tagsByRecipe = tags.ToLookup(t => t.RecipeId, t => t.Name);

        var candidates = recipes.Select(r => new SuggestionCandidate(
            r.Id,
            r.Name,
            plannedDatesByRecipe[r.Id].ToList(),
            tagsByRecipe[r.Id].ToList()));

        return FoodPlanSuggestionScorer.Score(query.Date, candidates, options, rules)
            .Take(count)
            .Select(s => new FoodPlanSuggestionResponse(s.RecipeId, s.Name, s.Score, s.Reasons, s.LastPlannedOn, s.TimesPlanned))
            .ToList();
    }
}
