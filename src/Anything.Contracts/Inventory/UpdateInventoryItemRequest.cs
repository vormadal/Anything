using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Inventory;

public record UpdateInventoryItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId,
    [Range(0, int.MaxValue, ErrorMessage = "Quantity must be zero or more.")]
    int? Quantity,
    [StringLength(100, ErrorMessage = "Brand must be 100 characters or less.")]
    string? Brand,
    [StringLength(100, ErrorMessage = "Model must be 100 characters or less.")]
    string? Model,
    [StringLength(100, ErrorMessage = "Serial number must be 100 characters or less.")]
    string? SerialNumber,
    DateTime? PurchasedOn,
    [Range(0, double.MaxValue, ErrorMessage = "Purchase price must be zero or more.")]
    decimal? PurchasePrice,
    DateTime? WarrantyExpiresOn,
    [StringLength(1000, ErrorMessage = "Notes must be 1000 characters or less.")]
    string? Notes);
