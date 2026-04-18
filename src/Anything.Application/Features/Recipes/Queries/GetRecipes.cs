using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipesQuery(string? Search = null, string? Tag = null) : IRequest<List<Recipe>>;

public class GetRecipesHandler(
    IRepository<Recipe> repository,
    IRepository<RecipeTag> tagRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetRecipesQuery, List<Recipe>>
{
    public async Task<List<Recipe>> Handle(GetRecipesQuery query, CancellationToken ct = default)
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

        return await baseQuery.ToListAsync(ct);
    }
}
