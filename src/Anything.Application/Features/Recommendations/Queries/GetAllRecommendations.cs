using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetAllRecommendationsQuery(int? CategoryId = null, bool SuggestableOnly = false) : IRequest<List<ShoppingListRecommendation>>;

public class GetAllRecommendationsHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetAllRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetAllRecommendationsQuery query, CancellationToken ct = default)
    {
        var q = repository.Query().Where(r => r.HouseholdId == householdContext.HouseholdId);

        if (query.CategoryId.HasValue)
            q = q.Where(r => r.CategoryId == query.CategoryId.Value);

        // The add-box autocomplete asks for suggestable-only so hidden (e.g. recipe-seeded)
        // recommendations never surface as suggestions; management views pass false to see all.
        if (query.SuggestableOnly)
            q = q.Where(r => r.IncludeInSuggestions);

        return await q.OrderBy(r => r.Name).ToListAsync(ct);
    }
}
