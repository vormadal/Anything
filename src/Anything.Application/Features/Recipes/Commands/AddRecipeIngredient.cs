using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeIngredientCommand(int RecipeId, string Name, decimal? Amount, string? Unit, string? Group) : IRequest<IResult>;

public class AddRecipeIngredientHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext,
    IUnitCatalog unitCatalog) : IRequestHandler<AddRecipeIngredientCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var maxSortOrder = await ingredientRepository.Query()
            .Where(i => i.RecipeId == command.RecipeId && i.DeletedOn == null)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(ct) ?? -1;

        var ingredient = new RecipeIngredient
        {
            RecipeId = command.RecipeId,
            Name = command.Name,
            Amount = command.Amount,
            Unit = command.Unit,
            Group = command.Group,
            SortOrder = maxSortOrder + 1,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        ingredientRepository.Add(ingredient);
        await unitCatalog.EnsureUnit(command.Unit, ct);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/recipes/{command.RecipeId}/ingredients/{ingredient.Id}", ingredient);
    }
}
