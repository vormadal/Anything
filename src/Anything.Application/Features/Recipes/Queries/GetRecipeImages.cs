using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeImagesQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeImagesHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeImage> imageRepository) : IRequestHandler<GetRecipeImagesQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeImagesQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(query.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var images = await imageRepository.Query()
            .Where(i => i.RecipeId == query.RecipeId && i.DeletedOn == null)
            .ToListAsync(ct);
        return Results.Ok(images);
    }
}
