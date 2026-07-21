namespace Anything.Core.Search;

/// <summary>A single ranked cross-entity search result, returned by <see cref="Anything.Core.Services.ISearchIndexService"/>.</summary>
public record SearchHit(string EntityType, int EntityId, string Title, string? Snippet);
