using Anything.Contracts.Search;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Search.Queries;

/// <summary>
/// Household-scoped summary of what's currently indexed, for the household
/// admin "is search populated/healthy" view — not a full document browser.
/// </summary>
public record GetSearchIndexOverviewQuery : IRequest<SearchIndexOverviewResponse>;

public class GetSearchIndexOverviewHandler(IRepository<SearchDocument> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetSearchIndexOverviewQuery, SearchIndexOverviewResponse>
{
    public async Task<SearchIndexOverviewResponse> Handle(GetSearchIndexOverviewQuery query, CancellationToken ct = default)
    {
        var baseQuery = repository.Query().AsNoTracking().Where(d => d.HouseholdId == householdContext.HouseholdId);

        var byType = await baseQuery
            .GroupBy(d => d.EntityType)
            .OrderBy(g => g.Key)
            .Select(g => new SearchIndexTypeCount(g.Key, g.Count()))
            .ToListAsync(ct);

        var lastIndexedOn = await baseQuery
            .OrderByDescending(d => d.ModifiedOn)
            .Select(d => (DateTime?)d.ModifiedOn)
            .FirstOrDefaultAsync(ct);

        return new SearchIndexOverviewResponse(byType.Sum(x => x.Count), byType, lastIndexedOn);
    }
}
