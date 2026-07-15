namespace Anything.Core.Search;

/// <summary>
/// Stubs for Postgres <c>pg_trgm</c> functions, mapped to SQL via EF Core
/// <c>HasDbFunction</c> in the DbContext. Calling them in-memory is not
/// supported — they exist only to be translated inside LINQ-to-Entities queries.
/// The dedicated <c>Npgsql.EntityFrameworkCore.PostgreSQL.Trigrams</c> plugin is
/// not available for EF Core 10, so we map the functions ourselves.
/// </summary>
public static class PgTrigramFunctions
{
    /// <summary>
    /// Maps to Postgres <c>word_similarity(source, target)</c>: the greatest
    /// similarity between the trigrams of <paramref name="source"/> and any
    /// contiguous word-boundary extent of <paramref name="target"/>. Typo-tolerant,
    /// and not penalised when <paramref name="target"/> is much longer than the query.
    /// </summary>
    public static float WordSimilarity(string source, string target) =>
        throw new InvalidOperationException(
            "PgTrigramFunctions.WordSimilarity is only usable inside an EF Core query.");
}
