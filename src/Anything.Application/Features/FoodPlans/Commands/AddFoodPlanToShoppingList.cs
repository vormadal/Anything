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

        var entries = await entryRepository.Query()
            .Where(e => e.DeletedOn == null && e.HouseholdId == householdContext.HouseholdId && e.Date >= command.StartDate && e.Date <= command.EndDate && e.RecipeId != null)
            .ToListAsync(ct);

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
        var existingRecommendations = await recommendationRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId && ingredientNamesLower.Contains(r.Name.ToLower()))
            .Select(r => r.Name.ToLower())
            .ToHashSetAsync(ct);

        foreach (var (name, amount, unit, addedByRecipe) in grouped)
        {
            var nameKey = name.ToLower();
            var unitKey = (unit ?? "").ToLower();
            var existing = existingItems.FirstOrDefault(i =>
                i.Name.Trim().ToLower() == nameKey &&
                (i.Unit ?? "").Trim().ToLower() == unitKey &&
                i.AddedByRecipe == addedByRecipe);

            if (existing != null)
            {
                existing.Amount = amount == null ? existing.Amount : (existing.Amount ?? 0) + amount;
                existing.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
                shoppingListItemRepository.Update(existing);
            }
            else
            {
                shoppingListItemRepository.Add(new ShoppingListItem
                {
                    ShoppingListId = command.ShoppingListId,
                    Name = name,
                    Amount = amount,
                    Unit = unit,
                    AddedByRecipe = string.IsNullOrEmpty(addedByRecipe) ? null : addedByRecipe,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
            }

            if (!existingRecommendations.Contains(nameKey))
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    HouseholdId = householdContext.HouseholdId,
                    Name = name,
                    IsApproved = false,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
                existingRecommendations.Add(nameKey);
            }
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
