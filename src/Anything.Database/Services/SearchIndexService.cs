using Anything.Core.Search;
using Anything.Core.Services;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace Anything.Database.Services;

public class SearchIndexService(ApplicationDbContext context) : ISearchIndexService
{
    // Mirrors Anything.Application.Common.FuzzySearch.SimilarityThreshold — kept
    // as a local copy since Anything.Database must not depend on Application.
    private const double SimilarityThreshold = 0.3;
    private const int SnippetLength = 160;

    public async Task<List<SearchHit>> Search(int householdId, string term, int limit, CancellationToken ct = default)
    {
        var normalized = term.Trim().ToLowerInvariant();
        var tsQuery = EF.Functions.PlainToTsQuery("simple", normalized);

        // Full-text (tsvector) matches rank first — they respect word boundaries
        // and multi-word queries, and hit the GIN index on the generated
        // SearchVector column. Trigram word_similarity is the typo-tolerant
        // fallback tier, same idiom as GetRecipesHandler/SearchRecommendationsHandler.
        var documents = await context.SearchDocuments
            .Where(d => d.HouseholdId == householdId)
            .Select(d => new
            {
                Document = d,
                FullTextMatch = EF.Property<NpgsqlTsVector>(d, "SearchVector").Matches(tsQuery),
                NameSimilarity = PgTrigramFunctions.WordSimilarity(normalized, d.Content),
            })
            .Where(x => x.FullTextMatch || x.NameSimilarity > SimilarityThreshold)
            .OrderByDescending(x => x.FullTextMatch)
            .ThenByDescending(x => x.NameSimilarity)
            .ThenBy(x => x.Document.Title)
            .Take(limit)
            .Select(x => x.Document)
            .ToListAsync(ct);

        return documents.Select(d => new SearchHit(
                d.EntityType,
                d.EntityId,
                d.Title,
                d.Content.Length > SnippetLength ? d.Content[..SnippetLength] + "…" : d.Content))
            .ToList();
    }
}
