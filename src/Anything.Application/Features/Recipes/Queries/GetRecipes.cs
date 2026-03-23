using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipesQuery(string? Search = null, string? Tag = null) : IRequest<List<Recipe>>;

public class GetRecipesHandler(
    IRepository<Recipe> repository,
    IRepository<RecipeTag> tagRepository,
    IRepository<RecipeIngredient> ingredientRepository)
    : IRequestHandler<GetRecipesQuery, List<Recipe>>
{
    public async Task<List<Recipe>> Handle(GetRecipesQuery query, CancellationToken ct = default)
    {
        var baseQuery = repository.Query().Where(r => r.DeletedOn == null);

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var tag = query.Tag.ToLower();
            var recipeIdsWithTag = await tagRepository.Query()
                .Where(t => t.DeletedOn == null && t.Name.ToLower() == tag)
                .Select(t => t.RecipeId)
                .Distinct()
                .ToListAsync(ct);
            baseQuery = baseQuery.Where(r => recipeIdsWithTag.Contains(r.Id));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            var recipeIdsMatchingTag = await tagRepository.Query()
                .Where(t => t.DeletedOn == null && t.Name.ToLower().Contains(search))
                .Select(t => t.RecipeId)
                .Distinct()
                .ToListAsync(ct);
            var recipeIdsMatchingIngredient = await ingredientRepository.Query()
                .Where(i => i.DeletedOn == null && i.Name.ToLower().Contains(search))
                .Select(i => i.RecipeId)
                .Distinct()
                .ToListAsync(ct);
            baseQuery = baseQuery.Where(r =>
                r.Name.ToLower().Contains(search) ||
                recipeIdsMatchingTag.Contains(r.Id) ||
                recipeIdsMatchingIngredient.Contains(r.Id));
        }

        return await baseQuery.ToListAsync(ct);
    }
}
