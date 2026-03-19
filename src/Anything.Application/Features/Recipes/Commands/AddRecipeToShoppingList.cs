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
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRecipeToShoppingListCommand, IResult>
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
