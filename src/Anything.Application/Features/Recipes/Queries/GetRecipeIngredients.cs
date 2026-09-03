using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeIngredientsQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeIngredientsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetRecipeIngredientsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeIngredientsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query().AsNoTracking()
            .Where(r => r.Id == query.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var ingredients = await ingredientRepository.Query().AsNoTracking()
            .Where(i => i.RecipeId == query.RecipeId && i.DeletedOn == null)
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.CreatedOn)
            .ToListAsync(ct);
        return Results.Ok(ingredients);
    }
}
