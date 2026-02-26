using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record CreateInventoryBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId);
