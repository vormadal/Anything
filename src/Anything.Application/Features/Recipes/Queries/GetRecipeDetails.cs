using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

/// <summary>
/// Aggregate read model for the recipe detail page: the recipe plus its
/// ingredients, steps, images and tags in a single response, so the page loads
/// from one request instead of five. Reuses the same element types the granular
/// endpoints return (<see cref="RecipeIngredient"/>, <see cref="RecipeStep"/>,
/// <see cref="RecipeImageResponse"/>, <see cref="RecipeTag"/>) so the generated
/// client reuses their models.
/// </summary>
public record RecipeDetailResponse(
    int Id,
    string Name,
    string? Link,
    string? Notes,
    int? CookTimeMinutes,
    int? Servings,
    string ServingsType,
    DateTime CreatedOn,
    List<RecipeIngredient> Ingredients,
    List<RecipeStep> Steps,
    List<RecipeImageResponse> Images,
    List<RecipeTag> Tags);

public record GetRecipeDetailsQuery(int Id) : IRequest<IResult>;

public class GetRecipeDetailsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IRepository<RecipeImage> imageRepository,
    IRepository<RecipeTag> tagRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<GetRecipeDetailsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeDetailsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == query.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == query.Id && i.DeletedOn == null)
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.CreatedOn)
            .ToListAsync(ct);

        var steps = await stepRepository.Query()
            .Where(s => s.RecipeId == query.Id && s.DeletedOn == null)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);

        var images = await imageRepository.Query()
            .Where(i => i.RecipeId == query.Id && i.DeletedOn == null)
            .OrderBy(i => i.CreatedOn)
            .ThenBy(i => i.Id)
            .ToListAsync(ct);

        var tags = await tagRepository.Query()
            .Where(t => t.RecipeId == query.Id && t.DeletedOn == null)
            .ToListAsync(ct);

        var imageResponses = images.Select(img => new RecipeImageResponse(
            img.Id,
            img.RecipeId,
            imageStorageService.GetImageUrl(img.StorageKey, 300, 300, "fill"),
            imageStorageService.GetImageUrl(img.StorageKey, 800, 600, "fit"),
            imageStorageService.GetImageUrl(img.StorageKey, 1920, 1080, "fit"),
            img.CreatedOn)).ToList();

        return Results.Ok(new RecipeDetailResponse(
            recipe.Id,
            recipe.Name,
            recipe.Link,
            recipe.Notes,
            recipe.CookTimeMinutes,
            recipe.Servings,
            recipe.ServingsType.ToString(),
            recipe.CreatedOn,
            ingredients,
            steps,
            imageResponses,
            tags));
    }
}
