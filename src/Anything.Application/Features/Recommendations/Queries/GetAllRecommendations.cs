using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetAllRecommendationsQuery(int? CategoryId = null) : IRequest<List<ShoppingListRecommendation>>;

public class GetAllRecommendationsHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetAllRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetAllRecommendationsQuery query, CancellationToken ct = default)
    {
        var q = repository.Query().Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId);

        if (query.CategoryId.HasValue)
            q = q.Where(r => r.CategoryId == query.CategoryId.Value);

        return await q.OrderBy(r => r.Name).ToListAsync(ct);
    }
}
