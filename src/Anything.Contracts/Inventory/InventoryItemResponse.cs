namespace Anything.Contracts.Inventory;

/// <summary>
/// A single item including its metadata and custom fields. Returned by
/// <c>GET /api/inventory-items/{id}</c>; the list endpoint uses the lighter
/// <see cref="InventoryItemSummaryResponse"/> instead, since <see cref="Fields"/>
/// would be wasted payload for a row that's never expanded.
/// </summary>
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
