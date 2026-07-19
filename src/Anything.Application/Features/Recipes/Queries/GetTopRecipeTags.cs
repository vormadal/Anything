using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetTopRecipeTagsQuery(int Count = 10) : IRequest<List<TopTagResponse>>;

public class GetTopRecipeTagsHandler(IRepository<RecipeTag> tagRepository, IRepository<Recipe> recipeRepository, IHouseholdContext householdContext)
    : IRequestHandler<GetTopRecipeTagsQuery, List<TopTagResponse>>
{
    public async Task<List<TopTagResponse>> Handle(GetTopRecipeTagsQuery query, CancellationToken ct = default)
    {
        var groups = await RecipeTagGroupingQuery.GroupedByHousehold(tagRepository, recipeRepository, householdContext)
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.Name)
            .Take(query.Count)
            .ToListAsync(ct);

        return groups.Select(g => new TopTagResponse(g.Name, g.Count)).ToList();
    }
}
