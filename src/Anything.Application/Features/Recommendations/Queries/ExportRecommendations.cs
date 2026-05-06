using Anything.Contracts.Recommendations;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

public record ExportRecommendationsQuery : IRequest<ExportRecommendationsResponse>;

public class ExportRecommendationsHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext)
    : IRequestHandler<ExportRecommendationsQuery, ExportRecommendationsResponse>
{
    public async Task<ExportRecommendationsResponse> Handle(ExportRecommendationsQuery query, CancellationToken ct = default)
    {
        var items = await repository.Query()
            .Where(r => r.HouseholdId == householdContext.HouseholdId)
            .OrderBy(r => r.Name)
            .Select(r => new RecommendationImportExportItem(
                r.Name,
                r.PreferredUnit,
                r.Category != null ? r.Category.Name : null))
            .ToListAsync(ct);

        return new ExportRecommendationsResponse(items);
    }
}
