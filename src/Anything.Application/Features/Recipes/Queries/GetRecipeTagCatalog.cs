using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeTagCatalogQuery : IRequest<List<TopTagResponse>>;

public class GetRecipeTagCatalogHandler(IRepository<RecipeTag> tagRepository, IRepository<Recipe> recipeRepository, IHouseholdContext householdContext)
    : IRequestHandler<GetRecipeTagCatalogQuery, List<TopTagResponse>>
{
    public async Task<List<TopTagResponse>> Handle(GetRecipeTagCatalogQuery query, CancellationToken ct = default)
    {
        var groups = await RecipeTagGroupingQuery.GroupedByHousehold(tagRepository, recipeRepository, householdContext)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);

        return groups.Select(g => new TopTagResponse(g.Name, g.Count)).ToList();
    }
}
