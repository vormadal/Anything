using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeTagsQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeTagsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository) : IRequestHandler<GetRecipeTagsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeTagsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(query.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var tags = await tagRepository.Query()
            .Where(t => t.RecipeId == query.RecipeId && t.DeletedOn == null)
            .ToListAsync(ct);
        return Results.Ok(tags);
    }
}
