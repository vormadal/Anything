namespace Anything.Core.Search;

/// <summary>
/// Implemented by entities that should be indexed for cross-entity search.
/// <see cref="Anything.Database.Interceptors.SearchIndexInterceptor"/> (see
/// src/Anything.Database/agent.md) watches the change tracker for entities
/// implementing this interface and keeps their <c>SearchDocument</c> row in
/// sync automatically, so adding a new searchable entity is just implementing
/// this interface — no interceptor or handler changes required.
/// </summary>
public interface ISearchable
{
    int HouseholdId { get; }
    string SearchEntityType { get; }
    int SearchEntityId { get; }
    string SearchTitle { get; }
    string SearchContent { get; }
}
