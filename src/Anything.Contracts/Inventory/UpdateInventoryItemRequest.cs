using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record UpdateInventoryItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId);
