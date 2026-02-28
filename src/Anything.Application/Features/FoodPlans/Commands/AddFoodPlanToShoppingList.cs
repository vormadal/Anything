using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanToShoppingListCommand(int FoodPlanId, int ShoppingListId) : IRequest<IResult>;

public class AddFoodPlanToShoppingListHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<ShoppingListItem> shoppingListItemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<AddFoodPlanToShoppingListCommand, IResult>
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

        var itemNames = ingredients.Select(ingredient => string.IsNullOrWhiteSpace(ingredient.Unit)
            ? $"{ingredient.Amount:0.##} {ingredient.Name}"
            : $"{ingredient.Amount:0.##} {ingredient.Unit} {ingredient.Name}").ToList();

        var itemNamesLower = itemNames.Select(n => n.ToLower()).ToHashSet();
        var existingRecommendations = await recommendationRepository.Query()
            .Where(r => r.DeletedOn == null && itemNamesLower.Contains(r.Name.ToLower()))
            .Select(r => r.Name.ToLower())
            .ToHashSetAsync(ct);

        foreach (var itemName in itemNames)
        {
            shoppingListItemRepository.Add(new ShoppingListItem
            {
                ShoppingListId = command.ShoppingListId,
                Name = itemName
            });

            var nameNormalized = itemName.Trim();
            if (!existingRecommendations.Contains(nameNormalized.ToLower()))
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    Name = nameNormalized,
                    IsApproved = false
                });
                existingRecommendations.Add(nameNormalized.ToLower());
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
