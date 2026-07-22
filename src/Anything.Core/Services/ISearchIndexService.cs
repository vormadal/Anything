using Anything.Core.Search;

namespace Anything.Core.Services;

/// <summary>
/// Ranked, cross-entity search over <c>SearchDocument</c> rows. Implemented in
/// Anything.Database (like <c>IRepository&lt;T&gt;</c>) rather than
/// Anything.Application.Services, because it needs direct access to
/// Postgres-specific full-text search (<c>tsvector</c>/<c>ts_query</c>), which
/// Application must not depend on.
/// </summary>
public interface ISearchIndexService
{
    Task<List<SearchHit>> Search(int householdId, string term, int limit, CancellationToken ct = default);
}
