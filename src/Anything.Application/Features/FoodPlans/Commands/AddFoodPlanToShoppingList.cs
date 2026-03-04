using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanToShoppingListCommand(int FoodPlanId, int ShoppingListId, IReadOnlyList<Anything.Contracts.FoodPlans.RecipeMultiplier>? RecipeMultipliers = null) : IRequest<IResult>;

public class AddFoodPlanToShoppingListHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<ShoppingListItem> shoppingListItemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddFoodPlanToShoppingListCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(AddFoodPlanToShoppingListCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        var shoppingList = await shoppingListRepository.GetById(command.ShoppingListId);
        if (shoppingList is null || shoppingList.DeletedOn != null)
            return Results.NotFound(ShoppingListNotFound);

        var recipeIds = await entryRepository.Query()
            .Where(e => e.FoodPlanId == command.FoodPlanId && e.DeletedOn == null && e.RecipeId != null)
            .Select(e => e.RecipeId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var ingredients = await ingredientRepository.Query()
            .Where(i => recipeIds.Contains(i.RecipeId) && i.DeletedOn == null)
            .ToListAsync(ct);

        var multiplierLookup = command.RecipeMultipliers?
            .ToDictionary(m => m.RecipeId, m => m.Multiplier > 0 ? m.Multiplier : 1.0)
            ?? new Dictionary<int, double>();

        var grouped = ingredients
            .GroupBy(i => (Name: i.Name.Trim().ToLower(), Unit: (i.Unit ?? "").Trim().ToLower()))
            .Select(g => (
                Name: g.First().Name.Trim(),
                Amount: g.Sum(i =>
                {
                    var mult = multiplierLookup.TryGetValue(i.RecipeId, out var m) ? m : 1.0;
                    return i.Amount * (decimal)mult;
                }),
                Unit: string.IsNullOrWhiteSpace(g.First().Unit) ? null : g.First().Unit?.Trim()
            ))
            .ToList();

        var existingItems = await shoppingListItemRepository.Query()
            .Where(i => i.ShoppingListId == command.ShoppingListId)
            .ToListAsync(ct);

        var ingredientNamesLower = grouped.Select(g => g.Name.ToLower()).ToHashSet();
        var existingRecommendations = await recommendationRepository.Query()
            .Where(r => r.DeletedOn == null && ingredientNamesLower.Contains(r.Name.ToLower()))
            .Select(r => r.Name.ToLower())
            .ToHashSetAsync(ct);

        foreach (var (name, amount, unit) in grouped)
        {
            var nameKey = name.ToLower();
            var unitKey = (unit ?? "").ToLower();
            var existing = existingItems.FirstOrDefault(i =>
                i.Name.Trim().ToLower() == nameKey &&
                (i.Unit ?? "").Trim().ToLower() == unitKey);

            if (existing != null)
            {
                existing.Amount = (existing.Amount ?? 0) + amount;
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
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
            }

            if (!existingRecommendations.Contains(nameKey))
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    Name = name,
                    IsApproved = false,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
                existingRecommendations.Add(nameKey);
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
