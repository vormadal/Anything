namespace Anything.Contracts.Inventory;

/// <param name="ParentId">The place this one is nested inside, e.g. a shed inside a specific summerhouse.</param>
/// <param name="ThumbnailUrl">
/// Thumbnail of the place's first photo attachment, so list rows can show one without a
/// per-row attachments call. Null when there is no photo — and also on the response of a
/// create, which by definition has no attachments yet.
/// </param>
public record InventoryStorageUnitResponse(
    int Id,
    string Name,
    int? ParentId,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    string? ThumbnailUrl = null);
