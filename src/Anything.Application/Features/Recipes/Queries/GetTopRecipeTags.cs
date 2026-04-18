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
        var groups = await tagRepository.Query()
            .Where(t => t.DeletedOn == null)
            .Join(
                recipeRepository.Query().Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId),
                t => t.RecipeId,
                r => r.Id,
                (t, r) => t)
            .GroupBy(t => t.Name.ToLower())
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.Name)
            .Take(query.Count)
            .ToListAsync(ct);

        return groups.Select(g => new TopTagResponse(g.Name, g.Count)).ToList();
    }
}
