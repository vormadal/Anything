using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetApprovedRecommendationsQuery : IRequest<List<ShoppingListRecommendation>>;

public class GetApprovedRecommendationsHandler(IRepository<ShoppingListRecommendation> repository)
    : IRequestHandler<GetApprovedRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetApprovedRecommendationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(r => r.IsApproved && r.DeletedOn == null)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }
}
