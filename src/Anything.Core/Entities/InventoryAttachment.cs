namespace Anything.Core.Entities;

/// <summary>
/// A photo or document attached to exactly one of an item, a box or a place.
/// Modelled as three nullable FKs rather than a polymorphic owner column so EF
/// gets real foreign keys and cascade behaviour. Exactly one is set by the
/// handler for the endpoint that created the row (the owner comes from the
/// route, never directly from the caller), not enforced by a DB constraint.
/// </summary>
public class InventoryAttachment
{
    public int Id { get; set; }
    public int? ItemId { get; set; }
    public int? BoxId { get; set; }
    public int? StorageUnitId { get; set; }
    public required string StorageKey { get; set; }
    public required string Name { get; set; }
    public required string ContentType { get; set; }
    public required string Kind { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
