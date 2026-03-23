using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetTopRecipeTagsQuery(int Count = 10) : IRequest<List<TopTagResponse>>;

public class GetTopRecipeTagsHandler(IRepository<RecipeTag> tagRepository)
    : IRequestHandler<GetTopRecipeTagsQuery, List<TopTagResponse>>
{
    public async Task<List<TopTagResponse>> Handle(GetTopRecipeTagsQuery query, CancellationToken ct = default)
    {
        return await tagRepository.Query()
            .Where(t => t.DeletedOn == null)
            .GroupBy(t => t.Name.ToLower())
            .Select(g => new TopTagResponse(g.First().Name, g.Count()))
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.Name)
            .Take(query.Count)
            .ToListAsync(ct);
    }
}
