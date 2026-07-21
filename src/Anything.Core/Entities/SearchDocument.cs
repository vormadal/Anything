namespace Anything.Core.Entities;

/// <summary>
/// A search-indexed projection of an <see cref="Anything.Core.Search.ISearchable"/>
/// entity, one row per source entity. Kept in sync automatically by
/// <c>SearchIndexInterceptor</c> — never written to directly outside of
/// <c>Anything.Database</c> and the rebuild command.
/// </summary>
public class SearchDocument
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string EntityType { get; set; }
    public int EntityId { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime ModifiedOn { get; set; }
}
