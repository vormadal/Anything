using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetPendingRecommendationsQuery : IRequest<List<ShoppingListRecommendation>>;

public class GetPendingRecommendationsHandler(IRepository<ShoppingListRecommendation> repository)
    : IRequestHandler<GetPendingRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetPendingRecommendationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(r => !r.IsApproved && r.DeletedOn == null)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }
}
