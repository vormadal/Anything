using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeToShoppingListCommand(int RecipeId, int ShoppingListId, double Multiplier = 1.0) : IRequest<IResult>;

public class AddRecipeToShoppingListHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<ShoppingListItem> shoppingListItemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<AddRecipeToShoppingListCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeToShoppingListCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var shoppingList = await shoppingListRepository.GetById(command.ShoppingListId);
        if (shoppingList is null || shoppingList.DeletedOn != null)
            return Results.NotFound("Shopping list not found.");

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == command.RecipeId && i.DeletedOn == null)
            .ToListAsync(ct);

        var multiplier = command.Multiplier > 0 ? command.Multiplier : 1.0;
        var itemNames = ingredients.Select(ingredient =>
        {
            var scaledAmount = ingredient.Amount * (decimal)multiplier;
            return string.IsNullOrWhiteSpace(ingredient.Unit)
                ? $"{scaledAmount:0.##} {ingredient.Name}"
                : $"{scaledAmount:0.##} {ingredient.Unit} {ingredient.Name}";
        }).ToList();

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

        try
        {
            await unitOfWork.SaveChanges(ct);
        }
        catch (DbUpdateException)
        {
            return Results.Problem("A database error occurred while saving the shopping list items.");
        }
        return Results.NoContent();
    }
}
