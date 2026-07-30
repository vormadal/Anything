using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record CreateInventoryStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    int? ParentId);
