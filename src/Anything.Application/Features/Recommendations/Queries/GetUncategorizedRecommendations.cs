using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetUncategorizedRecommendationsQuery : IRequest<List<ShoppingListRecommendation>>;

public class GetUncategorizedRecommendationsHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetUncategorizedRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetUncategorizedRecommendationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(r => r.DeletedOn == null && r.CategoryId == null && r.HouseholdId == householdContext.HouseholdId)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }
}
