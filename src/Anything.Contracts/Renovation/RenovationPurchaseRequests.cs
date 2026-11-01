using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

/// <summary>
/// One payment covering one or more lines. <see cref="TotalAmount"/> is split across the lines in
/// proportion to each line's estimate for the quantity bought (quantity × unit price).
/// </summary>
/// <param name="Vendor">Free-text shop name, used when no <paramref name="VendorId"/> is given.</param>
/// <param name="VendorId">
/// One of the household's vendors (<c>/api/vendors</c>). When set, its name replaces <paramref name="Vendor"/>.
/// </param>
public record CreateRenovationPurchaseRequest(
    [StringLength(200, ErrorMessage = "Vendor must be 200 characters or less.")]
    string? Vendor,
    int? VendorId,
    DateOnly PurchasedOn,
    [Range(typeof(decimal), "0", "1000000000", ErrorMessage = "Total must be between 0 and 1,000,000,000.")]
    decimal TotalAmount,
    [StringLength(1000, ErrorMessage = "Notes must be 1000 characters or less.")]
    string? Notes,
    [Required(ErrorMessage = "At least one line is required.")]
    [MinLength(1, ErrorMessage = "At least one line is required.")]
    [MaxLength(200, ErrorMessage = "At most 200 lines per purchase.")]
    List<CreateRenovationPurchaseLineRequest> Lines);

/// <param name="Quantity">How much of the line was bought — less than the remaining quantity for a partial purchase.</param>
/// <param name="MarkComplete">
/// Mark the line done even if less than its required quantity was bought (e.g. the waste allowance wasn't needed).
/// A line is treated as done anyway once its purchased quantity reaches the required quantity.
/// </param>
public record CreateRenovationPurchaseLineRequest(
    [Range(1, int.MaxValue, ErrorMessage = "Line is required.")]
    int LineId,
    [Range(typeof(decimal), "0.01", "1000000", ErrorMessage = "Quantity must be between 0.01 and 1,000,000.")]
    decimal Quantity,
    bool MarkComplete = false);

public record RenovationPurchaseResponse(
    int Id,
    string? Vendor,
    int? VendorId,
    DateOnly PurchasedOn,
    decimal TotalAmount,
    string? Notes,
    List<RenovationPurchaseLineResponse> Lines,
    DateTime CreatedOn);

public record RenovationPurchaseLineResponse(
    int LineId,
    int RoomId,
    string RoomName,
    string LineLabel,
    string Description,
    string Unit,
    decimal Quantity,
    decimal Amount,
    int? InventoryItemId);

/// <summary>
/// Adds one purchased line to the inventory as a single item. The box, when given, decides the place;
/// Brand/Model/WarrantyExpiresOn are the only metadata the purchase doesn't already supply.
/// </summary>
public record AddRenovationLineToInventoryRequest(
    int? BoxId,
    int? StorageUnitId,
    DateTime? WarrantyExpiresOn,
    [StringLength(100, ErrorMessage = "Brand must be 100 characters or less.")]
    string? Brand,
    [StringLength(100, ErrorMessage = "Model must be 100 characters or less.")]
    string? Model);
