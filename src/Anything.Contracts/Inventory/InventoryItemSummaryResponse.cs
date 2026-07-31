namespace Anything.Contracts.Inventory;

/// <summary>An item as shown in lists: no custom fields, so listing many items stays cheap.</summary>
/// <param name="ThumbnailUrl">
/// Thumbnail of the item's first photo attachment, so list rows can show one without a
/// per-row attachments call. Null when there is no photo — and also on the response of a
/// create, which by definition has no attachments yet.
/// </param>
public record InventoryItemSummaryResponse(
    int Id,
    string Name,
    string? Description,
    int? BoxId,
    int? StorageUnitId,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    string? ThumbnailUrl = null);
