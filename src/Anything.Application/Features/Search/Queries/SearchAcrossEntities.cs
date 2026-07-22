using Anything.Contracts.Search;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Search.Queries;

/// <summary>
/// Ranked search across every indexed entity type (see <see cref="Anything.Core.Search.ISearchable"/>).
/// </summary>
public record GetSearchResultsQuery(string Term, int Limit = 20) : IRequest<List<SearchResultResponse>>;

public class GetSearchResultsHandler(ISearchIndexService searchIndexService, IHouseholdContext householdContext)
    : IRequestHandler<GetSearchResultsQuery, List<SearchResultResponse>>
{
    private const int MaxLimit = 50;

    public async Task<List<SearchResultResponse>> Handle(GetSearchResultsQuery query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query.Term))
            return [];

        var limit = Math.Clamp(query.Limit, 1, MaxLimit);
        var hits = await searchIndexService.Search(householdContext.HouseholdId, query.Term, limit, ct);

        return hits.Select(h => new SearchResultResponse(h.EntityType, h.EntityId, h.Title, h.Snippet)).ToList();
    }
}
