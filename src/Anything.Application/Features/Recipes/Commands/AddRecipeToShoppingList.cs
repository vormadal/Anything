using Anything.Application.Features.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
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
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRecipeToShoppingListCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(AddRecipeToShoppingListCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var shoppingList = await shoppingListRepository.Query()
            .Where(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (shoppingList is null)
            return Results.NotFound(ShoppingListNotFound);

        if (shoppingList.Type == ListType.General)
            return Results.BadRequest("Cannot add recipe to a general checklist.");

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == command.RecipeId && i.DeletedOn == null)
            .ToListAsync(ct);

        var multiplier = command.Multiplier >= 0 ? command.Multiplier : 1.0;

        if (multiplier == 0)
            return Results.NoContent();

        var grouped = ingredients
            .GroupBy(i => (Name: i.Name.Trim().ToLower(), Unit: (i.Unit ?? "").Trim().ToLower()))
            .Select(g => (
                Name: g.First().Name.Trim(),
                Amount: g.Sum(i => (i.Amount ?? 0) * (decimal)multiplier) is var s && s > 0 ? s : (decimal?)null,
                Unit: string.IsNullOrWhiteSpace(g.First().Unit) ? null : g.First().Unit?.Trim()
            ))
            .ToList();

        var existingItems = await shoppingListItemRepository.Query()
            .Where(i => i.ShoppingListId == command.ShoppingListId)
            .ToListAsync(ct);

        var ingredientNamesLower = grouped.Select(g => g.Name.ToLower()).ToHashSet();
        var existingRecommendations = await ShoppingListHelpers.GetExistingRecommendationNamesAsync(
            recommendationRepository, householdContext.HouseholdId, ingredientNamesLower, ct);

        foreach (var (name, amount, unit) in grouped)
        {
            ShoppingListHelpers.MergeOrAddItem(shoppingListItemRepository, existingItems,
                command.ShoppingListId, name, amount, unit, recipe.Name, timeProvider.GetUtcNow().UtcDateTime);
            // Recipe ingredient names are seeded hidden: they can be categorized so the item
            // sorts correctly, but they must not clutter the add-box autocomplete suggestions.
            ShoppingListHelpers.AddRecommendationIfNotExists(recommendationRepository, existingRecommendations,
                householdContext.HouseholdId, name, timeProvider.GetUtcNow().UtcDateTime, includeInSuggestions: false);
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
