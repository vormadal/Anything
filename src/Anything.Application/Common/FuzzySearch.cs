namespace Anything.Application.Common;

/// <summary>
/// Shared constants and helpers for Postgres <c>pg_trgm</c>-based fuzzy search.
/// Handlers rank candidates with <see cref="Microsoft.EntityFrameworkCore.EF.Functions"/>
/// <c>TrigramsWordSimilarity</c> and keep rows whose similarity clears
/// <see cref="SimilarityThreshold"/> (or that contain the search term as a substring).
/// </summary>
public static class FuzzySearch
{
    /// <summary>
    /// Minimum trigram similarity (0..1) for a fuzzy name match to be considered
    /// relevant. Tuned to tolerate single-character typos on short words while
    /// keeping unrelated results out.
    /// </summary>
    public const double SimilarityThreshold = 0.3;

    /// <summary>
    /// Normalizes a search term for case-insensitive substring comparisons
    /// (trimmed + lower-cased). Trigram similarity is already case-insensitive.
    /// </summary>
    public static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
