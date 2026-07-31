using Anything.Contracts.Inventory;
using Anything.Core.Entities;

namespace Anything.Application.Features.Inventory;

/// <summary>Shared entity-to-contract projections for the Inventory feature.</summary>
public static class InventoryMapping
{
    // `thumbnailUrl` is optional so the create handlers — whose entity has no attachments yet —
    // keep calling these unchanged. Only the query handlers resolve it, via InventoryThumbnailLookup.
    public static InventoryStorageUnitResponse ToResponse(InventoryStorageUnit storageUnit, string? thumbnailUrl = null) =>
        new(storageUnit.Id, storageUnit.Name, storageUnit.ParentId, storageUnit.CreatedOn, storageUnit.ModifiedOn, thumbnailUrl);

    public static InventoryBoxResponse ToResponse(InventoryBox box, string? thumbnailUrl = null) =>
        new(box.Id, box.Number, box.Label, box.Description, box.StorageUnitId, box.CreatedOn, box.ModifiedOn, thumbnailUrl);

    public static InventoryItemSummaryResponse ToSummary(InventoryItem item, string? thumbnailUrl = null) =>
        new(item.Id, item.Name, item.Description, item.BoxId, item.StorageUnitId, item.CreatedOn, item.ModifiedOn, thumbnailUrl);

    public static InventoryItemResponse ToResponse(InventoryItem item, IReadOnlyList<InventoryItemField> fields) =>
        new(
            item.Id,
            item.Name,
            item.Description,
            item.BoxId,
            item.StorageUnitId,
            item.Quantity,
            item.Brand,
            item.Model,
            item.SerialNumber,
            item.PurchasedOn,
            item.PurchasePrice,
            item.WarrantyExpiresOn,
            item.Notes,
            item.CreatedOn,
            item.ModifiedOn,
            fields.OrderBy(f => f.SortOrder).Select(ToResponse).ToList());

    public static InventoryItemFieldResponse ToResponse(InventoryItemField field) =>
        new(field.Id, field.Label, field.Value, field.SortOrder);
}
