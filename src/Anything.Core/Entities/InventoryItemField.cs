namespace Anything.Core.Entities;

/// <summary>
/// A free-form label/value pair on an <see cref="InventoryItem"/>, for
/// metadata that doesn't have a dedicated column. Not search-indexed — see
/// src/Anything.Database/agent.md.
/// </summary>
public class InventoryItemField
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public required string Label { get; set; }
    public required string Value { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
