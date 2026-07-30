namespace Anything.Contracts.Inventory;

public record InventoryStorageUnitResponse(
    int Id,
    string Name,
    string? Type,
    int? ParentId,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
