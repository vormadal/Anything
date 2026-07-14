using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipesQuery(string? Search = null, string? Tag = null) : IRequest<List<RecipeListItemResponse>>;

public class GetRecipesHandler(
    IRepository<Recipe> repository,
    IRepository<RecipeTag> tagRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeImage> imageRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext)
    : IRequestHandler<GetRecipesQuery, List<RecipeListItemResponse>>
{
    // Matches the thumbnail size/mode used by GetRecipeImages so the list and
    // detail views resolve the same cached image variant.
    private const int ThumbnailSize = 300;
    private const string ThumbnailMode = "fill";

    public async Task<List<RecipeListItemResponse>> Handle(GetRecipesQuery query, CancellationToken ct = default)
    {
        var baseQuery = repository.Query().Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId);

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var tag = query.Tag.ToLower();
            baseQuery = baseQuery.Where(r =>
                tagRepository.Query()
                    .Any(t => t.RecipeId == r.Id && t.DeletedOn == null && t.Name.ToLower() == tag));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            baseQuery = baseQuery.Where(r =>
                r.Name.ToLower().Contains(search) ||
                tagRepository.Query()
                    .Any(t => t.RecipeId == r.Id && t.DeletedOn == null && t.Name.ToLower().Contains(search)) ||
                ingredientRepository.Query()
                    .Any(i => i.RecipeId == r.Id && i.DeletedOn == null && i.Name.ToLower().Contains(search)));
        }

        var recipes = await baseQuery.ToListAsync(ct);
        var recipeIds = recipes.Select(r => r.Id).ToList();

        // Batch-load tags and images for every result recipe in one query each
        // (avoids the client's former per-card image + tag requests).
        var tagsByRecipe = (await tagRepository.Query()
                .Where(t => recipeIds.Contains(t.RecipeId) && t.DeletedOn == null)
                .ToListAsync(ct))
            .GroupBy(t => t.RecipeId)
            .ToDictionary(g => g.Key, g => g.Select(t => t.Name).ToList());

        var thumbnailKeyByRecipe = (await imageRepository.Query()
                .Where(i => recipeIds.Contains(i.RecipeId) && i.DeletedOn == null)
                .ToListAsync(ct))
            .GroupBy(i => i.RecipeId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(i => i.CreatedOn).ThenBy(i => i.Id).First().StorageKey);

        return recipes.Select(r => new RecipeListItemResponse(
                r.Id,
                r.Name,
                r.Link,
                r.Notes,
                r.CookTimeMinutes,
                r.Servings,
                r.ServingsType.ToString(),
                r.CreatedOn,
                thumbnailKeyByRecipe.TryGetValue(r.Id, out var key)
                    ? imageStorageService.GetImageUrl(key, ThumbnailSize, ThumbnailSize, ThumbnailMode)
                    : null,
                tagsByRecipe.TryGetValue(r.Id, out var tags) ? tags : []))
            .ToList();
    }
}
