using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record GetAllRecommendationsQuery : IRequest<List<ShoppingListRecommendation>>;

public class GetAllRecommendationsHandler(IRepository<ShoppingListRecommendation> repository)
    : IRequestHandler<GetAllRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetAllRecommendationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(r => r.DeletedOn == null)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }
}
