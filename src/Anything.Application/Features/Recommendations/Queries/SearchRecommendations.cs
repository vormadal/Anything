using Anything.Application.Common;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

/// <summary>
/// Ranked, typo-tolerant search over a household's shopping-list recommendations.
/// Backs the item-suggestion typeahead and the recommendations admin search.
/// </summary>
/// <remarks>
/// Substring matches rank first, then trigram word-similarity closeness, so a
/// mistyped query still returns the intended recommendation. A blank search
/// returns the alphabetical list capped at <see cref="SearchRecommendationsQuery.Limit"/>.
/// </remarks>
public record SearchRecommendationsQuery(string? Search = null, int Limit = 20)
    : IRequest<List<ShoppingListRecommendation>>;

public class SearchRecommendationsHandler(
    IRepository<ShoppingListRecommendation> repository,
    IHouseholdContext householdContext)
    : IRequestHandler<SearchRecommendationsQuery, List<ShoppingListRecommendation>>
{
    private const int MaxLimit = 50;

    public async Task<List<ShoppingListRecommendation>> Handle(SearchRecommendationsQuery query, CancellationToken ct = default)
    {
        var limit = Math.Clamp(query.Limit, 1, MaxLimit);
        var baseQuery = repository.Query().Where(r => r.HouseholdId == householdContext.HouseholdId);

        if (string.IsNullOrWhiteSpace(query.Search))
        {
            return await baseQuery.OrderBy(r => r.Name).Take(limit).ToListAsync(ct);
        }

        var search = FuzzySearch.Normalize(query.Search);
        // Substring matches rank first, then fuzzy (trigram) closeness. A mistyped
        // query still matches because trigram similarity is typo-tolerant.
        return await baseQuery
            .Select(r => new
            {
                Recommendation = r,
                NameContains = r.Name.ToLower().Contains(search),
                // word_similarity scores the search term against the closest extent
                // within the name, so a typo ("tomatoe") still matches "Tomato".
                NameSimilarity = PgTrigramFunctions.WordSimilarity(search, r.Name),
            })
            .Where(x => x.NameContains || x.NameSimilarity > FuzzySearch.SimilarityThreshold)
            .OrderByDescending(x => x.NameContains)
            .ThenByDescending(x => x.NameSimilarity)
            .ThenBy(x => x.Recommendation.Name)
            .Take(limit)
            .Select(x => x.Recommendation)
            .ToListAsync(ct);
    }
}
