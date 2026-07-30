namespace Anything.Contracts.Inventory;

/// <param name="ParentId">The place this one is nested inside, e.g. a shed inside a specific summerhouse.</param>
public record InventoryStorageUnitResponse(
    int Id,
    string Name,
    string? Type,
    int? ParentId,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
