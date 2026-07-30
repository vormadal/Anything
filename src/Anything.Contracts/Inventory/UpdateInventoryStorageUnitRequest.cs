using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record UpdateInventoryStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(100, ErrorMessage = "Type must be 100 characters or less.")]
    string? Type,
    int? ParentId);
