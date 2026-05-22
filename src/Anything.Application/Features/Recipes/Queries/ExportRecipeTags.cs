using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record ExportRecipeTagsQuery : IRequest<ExportRecipeTagsResponse>;

public class ExportRecipeTagsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeTag> tagRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<ExportRecipeTagsQuery, ExportRecipeTagsResponse>
{
    public async Task<ExportRecipeTagsResponse> Handle(ExportRecipeTagsQuery query, CancellationToken ct = default)
    {
        var recipes = await recipeRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(ct);

        var recipeIds = recipes.Select(r => r.Id).ToList();

        var ingredients = await ingredientRepository.Query()
            .Where(i => recipeIds.Contains(i.RecipeId) && i.DeletedOn == null)
            .OrderBy(i => i.RecipeId)
            .ThenBy(i => i.SortOrder)
            .ThenBy(i => i.Name)
            .Select(i => new { i.RecipeId, i.Name })
            .ToListAsync(ct);

        var tags = await tagRepository.Query()
            .Where(t => recipeIds.Contains(t.RecipeId) && t.DeletedOn == null)
            .Select(t => new { t.RecipeId, t.Name })
            .ToListAsync(ct);

        var ingredientLookup = ingredients
            .ToLookup(i => i.RecipeId, i => i.Name);
        var tagLookup = tags
            .ToLookup(t => t.RecipeId, t => t.Name);

        var items = recipes.Select(r => new RecipeTagExportItem(
                r.Name,
                ingredientLookup[r.Id].ToList(),
                tagLookup[r.Id]
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
                    .ToList()))
            .ToList();

        return new ExportRecipeTagsResponse(items);
    }
}
