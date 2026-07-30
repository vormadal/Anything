using Anything.Contracts.Inventory;
using Anything.Core.Entities;

namespace Anything.Application.Features.Inventory;

/// <summary>Shared entity-to-contract projections for the Inventory feature.</summary>
public static class InventoryMapping
{
    public static InventoryStorageUnitResponse ToResponse(InventoryStorageUnit storageUnit) =>
        new(storageUnit.Id, storageUnit.Name, storageUnit.ParentId, storageUnit.CreatedOn, storageUnit.ModifiedOn);

    public static InventoryBoxResponse ToResponse(InventoryBox box) =>
        new(box.Id, box.Number, box.Label, box.Description, box.StorageUnitId, box.CreatedOn, box.ModifiedOn);

    public static InventoryItemSummaryResponse ToSummary(InventoryItem item) =>
        new(item.Id, item.Name, item.Description, item.BoxId, item.StorageUnitId, item.CreatedOn, item.ModifiedOn);

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
