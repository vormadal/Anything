using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeIngredientsQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeIngredientsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository) : IRequestHandler<GetRecipeIngredientsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeIngredientsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(query.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == query.RecipeId && i.DeletedOn == null)
            .ToListAsync(ct);
        return Results.Ok(ingredients);
    }
}
