namespace Anything.Contracts.Inventory;

public record InventoryAttachmentResponse(
    int Id,
    string Name,
    string ContentType,
    string Kind,
    string Url,
    string? ThumbnailUrl,
    int SortOrder,
    DateTime CreatedOn);
