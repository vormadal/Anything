namespace Anything.Contracts.Inventory;

/// <param name="ThumbnailUrl">
/// Thumbnail of the box's first photo attachment, so list rows can show one without a
/// per-row attachments call. Null when there is no photo — and also on the response of a
/// create, which by definition has no attachments yet.
/// </param>
public record InventoryBoxResponse(
    int Id,
    int Number,
    string? Label,
    string? Description,
    int? StorageUnitId,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    string? ThumbnailUrl = null);
