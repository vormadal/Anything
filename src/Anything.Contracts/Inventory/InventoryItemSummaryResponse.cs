namespace Anything.Contracts.Inventory;

/// <summary>An item as shown in lists: no custom fields, so listing many items stays cheap.</summary>
public record InventoryItemSummaryResponse(
    int Id,
    string Name,
    string? Description,
    int? BoxId,
    int? StorageUnitId,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
