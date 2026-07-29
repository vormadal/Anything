namespace Anything.Contracts.Inventory;

/// <summary>A single item including its metadata and custom fields.</summary>
public record InventoryItemResponse(
    int Id,
    string Name,
    string? Description,
    int? BoxId,
    int? StorageUnitId,
    int? Quantity,
    string? Brand,
    string? Model,
    string? SerialNumber,
    DateTime? PurchasedOn,
    decimal? PurchasePrice,
    DateTime? WarrantyExpiresOn,
    string? Notes,
    DateTime CreatedOn,
    DateTime? ModifiedOn,
    IReadOnlyList<InventoryItemFieldResponse> Fields);
