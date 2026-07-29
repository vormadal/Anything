namespace Anything.Contracts.Inventory;

public record InventoryBoxResponse(
    int Id,
    int Number,
    string? Label,
    string? Description,
    int? StorageUnitId,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
