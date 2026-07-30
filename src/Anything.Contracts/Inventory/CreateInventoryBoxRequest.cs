using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record CreateInventoryBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId,
    [StringLength(200, ErrorMessage = "Label must be 200 characters or less.")]
    string? Label,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description);
