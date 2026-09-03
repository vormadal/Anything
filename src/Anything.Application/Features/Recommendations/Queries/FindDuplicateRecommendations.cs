using Anything.Application.Common;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

/// <summary>
/// Scans a household's shopping-list recommendations for near-duplicate names
/// (typos, plurals, casing) and returns them clustered into groups so a manager
/// can merge each group into a single canonical entry.
/// </summary>
/// <remarks>
/// Pairwise symmetric trigram <see cref="PgTrigramFunctions.Similarity"/> above
/// <see cref="FuzzySearch.DuplicateSimilarityThreshold"/> defines "similar"; the
/// resulting pairs are clustered transitively (union-find) so a chain like
/// "Tomato"–"Tomatoe"–"Tomatos" surfaces as one group. This is a bounded,
/// manager-only admin operation, so the O(n²) self-join over one household's
/// suggestions is acceptable.
/// </remarks>
public record FindDuplicateRecommendationsQuery : IRequest<List<DuplicateRecommendationGroup>>;

/// <summary>A cluster of near-duplicate recommendations that can be merged together.</summary>
public record DuplicateRecommendationGroup(List<ShoppingListRecommendation> Members);

public class FindDuplicateRecommendationsHandler(
    IRepository<ShoppingListRecommendation> repository,
    IHouseholdContext householdContext)
    : IRequestHandler<FindDuplicateRecommendationsQuery, List<DuplicateRecommendationGroup>>
{
    public async Task<List<DuplicateRecommendationGroup>> Handle(FindDuplicateRecommendationsQuery query, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var baseQuery = repository.Query().AsNoTracking().Where(r => r.HouseholdId == householdId);

        // Self-join scored by symmetric trigram similarity. b.Id > a.Id emits each
        // unordered pair once.
        var pairs = await baseQuery
            .SelectMany(
                a => baseQuery.Where(b =>
                        b.Id > a.Id
                        && PgTrigramFunctions.Similarity(a.Name, b.Name) > FuzzySearch.DuplicateSimilarityThreshold),
                (a, b) => new { A = a, B = b })
            .ToListAsync(ct);

        if (pairs.Count == 0)
            return [];

        // Every recommendation that appears in at least one similar pair.
        var byId = new Dictionary<int, ShoppingListRecommendation>();
        foreach (var pair in pairs)
        {
            byId[pair.A.Id] = pair.A;
            byId[pair.B.Id] = pair.B;
        }

        // Union-find over the pair edges clusters transitively-similar names.
        var parent = byId.Keys.ToDictionary(id => id, id => id);

        int Find(int node)
        {
            while (parent[node] != node)
            {
                parent[node] = parent[parent[node]];
                node = parent[node];
            }
            return node;
        }

        foreach (var pair in pairs)
        {
            var rootA = Find(pair.A.Id);
            var rootB = Find(pair.B.Id);
            if (rootA != rootB)
                parent[rootA] = rootB;
        }

        return byId.Values
            .GroupBy(r => Find(r.Id))
            .Select(g => new DuplicateRecommendationGroup(g.OrderBy(r => r.Name).ToList()))
            .OrderByDescending(g => g.Members.Count)
            .ThenBy(g => g.Members[0].Name)
            .ToList();
    }
}
