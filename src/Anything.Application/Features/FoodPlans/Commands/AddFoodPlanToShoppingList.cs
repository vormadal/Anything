using Anything.Application.Features.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanToShoppingListCommand(
    int ShoppingListId,
    DateTime StartDate,
    DateTime EndDate,
    IReadOnlyList<Anything.Contracts.FoodPlans.RecipeMultiplier>? RecipeMultipliers = null) : IRequest<IResult>;

public class AddFoodPlanToShoppingListHandler(
    IRepository<FoodPlanEntry> entryRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<ShoppingListItem> shoppingListItemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddFoodPlanToShoppingListCommand, IResult>
{
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(AddFoodPlanToShoppingListCommand command, CancellationToken ct = default)
    {
        var shoppingList = await shoppingListRepository.Query()
            .Where(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (shoppingList is null)
            return Results.NotFound(ShoppingListNotFound);

        if (shoppingList.Type == ListType.General)
            return Results.BadRequest("Cannot add food plan to a general checklist.");

        var entries = await entryRepository.Query()
            .Where(e => e.DeletedOn == null && e.HouseholdId == householdContext.HouseholdId && e.Date >= command.StartDate && e.Date <= command.EndDate && e.RecipeId != null)
            .ToListAsync(ct);

        if (entries.Count == 0)
            return Results.NoContent();

        var recipeIds = entries
            .Select(e => e.RecipeId!.Value)
            .Distinct()
            .ToList();

        var recipeNameLookup = entries
            .Where(e => e.RecipeId != null)
            .GroupBy(e => e.RecipeId!.Value)
            .ToDictionary(g => g.Key, g => g.First().Name);

        var ingredients = await ingredientRepository.Query()
            .Where(i => recipeIds.Contains(i.RecipeId) && i.DeletedOn == null)
            .ToListAsync(ct);

        var multiplierLookup = command.RecipeMultipliers?
            .ToDictionary(m => m.RecipeId, m => m.Multiplier >= 0 ? m.Multiplier : 1.0)
            ?? new Dictionary<int, double>();

        var grouped = ingredients
            .Where(i => !multiplierLookup.TryGetValue(i.RecipeId, out var m) || m > 0)
            .GroupBy(i => (Name: i.Name.Trim().ToLower(), Unit: (i.Unit ?? "").Trim().ToLower(), RecipeId: i.RecipeId))
            .Select(g => (
                Name: g.First().Name.Trim(),
                Amount: g.Sum(i =>
                {
                    var mult = multiplierLookup.TryGetValue(i.RecipeId, out var m) ? m : 1.0;
                    return i.Amount * (decimal)mult;
                }) is var s && s > 0 ? s : (decimal?)null,
                Unit: string.IsNullOrWhiteSpace(g.First().Unit) ? null : g.First().Unit?.Trim(),
                AddedByRecipe: recipeNameLookup.TryGetValue(g.Key.RecipeId, out var n) ? n : null
            ))
            .ToList();

        var existingItems = await shoppingListItemRepository.Query()
            .Where(i => i.ShoppingListId == command.ShoppingListId)
            .ToListAsync(ct);

        var ingredientNamesLower = grouped.Select(g => g.Name.ToLower()).ToHashSet();
        var existingRecommendations = await ShoppingListHelpers.GetExistingRecommendationNames(
            recommendationRepository, householdContext.HouseholdId, command.ShoppingListId, ingredientNamesLower, ct);

        foreach (var (name, amount, unit, addedByRecipe) in grouped)
        {
            var hasExistingItemForRecipe = existingItems.Any(i =>
                !i.IsChecked &&
                i.Name.Trim().Equals(name.Trim(), StringComparison.OrdinalIgnoreCase) &&
                (i.Unit ?? "").Trim().Equals((unit ?? "").Trim(), StringComparison.OrdinalIgnoreCase) &&
                string.Equals(i.AddedByRecipe, addedByRecipe, StringComparison.Ordinal));

            if (hasExistingItemForRecipe)
                continue;

            ShoppingListHelpers.MergeOrAddItem(shoppingListItemRepository, existingItems,
                command.ShoppingListId, name, amount, unit,
                string.IsNullOrEmpty(addedByRecipe) ? null : addedByRecipe,
                timeProvider.GetUtcNow().UtcDateTime);
            // Recipe ingredient names are seeded hidden: categorizable for sorting, but kept
            // out of the add-box autocomplete suggestions.
            ShoppingListHelpers.AddRecommendationIfNotExists(recommendationRepository, existingRecommendations,
                householdContext.HouseholdId, command.ShoppingListId, name, timeProvider.GetUtcNow().UtcDateTime, includeInSuggestions: false);
        }

        // Mark entries as added to shopping list
        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var entry in entries)
        {
            entry.AddedToShoppingListOn = now;
            entryRepository.Update(entry);
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
