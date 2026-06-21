using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetSharedRecipeQuery(string Token) : IRequest<IResult>;

public class GetSharedRecipeHandler(
    IRepository<RecipeShareToken> shareRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IRepository<RecipeTag> tagRepository,
    IRepository<RecipeImage> imageRepository,
    IImageStorageService imageStorageService,
    TimeProvider timeProvider) : IRequestHandler<GetSharedRecipeQuery, IResult>
{
    private const string TokenNotFound = "Share link not found.";

    public async Task<IResult> Handle(GetSharedRecipeQuery query, CancellationToken ct = default)
    {
        var share = await shareRepository.Query()
            .Where(s => s.Token == query.Token)
            .FirstOrDefaultAsync(ct);

        if (share is null)
            return Results.NotFound(TokenNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var isExpired = share.ExpiresAt.HasValue && share.ExpiresAt.Value < now;

        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == share.RecipeId && r.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (recipe is null)
            return Results.NotFound(TokenNotFound);

        if (isExpired)
        {
            return Results.Ok(new SharedRecipeResponse(
                recipe.Id,
                recipe.Name,
                null, null, null,
                recipe.ServingsType.ToString(),
                [], [], [], [],
                IsExpired: true,
                IsTargeted: share.TargetEmail is not null,
                TargetEmail: share.TargetEmail
            ));
        }

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == share.RecipeId && i.DeletedOn == null)
            .OrderBy(i => i.SortOrder)
            .Select(i => new SharedIngredientResponse(i.Name, i.Amount, i.Unit, i.Group, i.SortOrder))
            .ToListAsync(ct);

        var steps = await stepRepository.Query()
            .Where(s => s.RecipeId == share.RecipeId && s.DeletedOn == null)
            .OrderBy(s => s.Order)
            .Select(s => new SharedStepResponse(s.Text, s.Order))
            .ToListAsync(ct);

        var tags = await tagRepository.Query()
            .Where(t => t.RecipeId == share.RecipeId && t.DeletedOn == null)
            .Select(t => t.Name)
            .ToListAsync(ct);

        var images = await imageRepository.Query()
            .Where(i => i.RecipeId == share.RecipeId && i.DeletedOn == null)
            .ToListAsync(ct);

        var imageUrls = images
            .Select(img => imageStorageService.GetImageUrl(img.StorageKey, 800, 600, "fit"))
            .ToList();

        return Results.Ok(new SharedRecipeResponse(
            recipe.Id,
            recipe.Name,
            recipe.Notes,
            recipe.CookTimeMinutes,
            recipe.Servings,
            recipe.ServingsType.ToString(),
            ingredients,
            steps,
            tags,
            imageUrls,
            IsExpired: false,
            IsTargeted: share.TargetEmail is not null,
            TargetEmail: share.TargetEmail
        ));
    }
}
