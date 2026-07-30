using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record InventoryItemFieldInput(
    [Required(ErrorMessage = "Label is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Label must be between 1 and 100 characters.")]
    string Label,
    [Required(ErrorMessage = "Value is required.")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Value must be between 1 and 500 characters.")]
    string Value);

/// <summary>Replaces an item's entire custom-field list, in the given order.</summary>
public record UpdateInventoryItemFieldsRequest(IReadOnlyList<InventoryItemFieldInput> Fields);
