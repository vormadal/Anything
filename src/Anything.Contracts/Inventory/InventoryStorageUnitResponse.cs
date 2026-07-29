namespace Anything.Contracts.Inventory;

public record InventoryStorageUnitResponse(
    int Id,
    string Name,
    string? Type,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
