using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

/// <summary>
/// One payment covering one or more lines. <see cref="TotalAmount"/> is split across the lines in
/// proportion to each line's estimate for the quantity bought (quantity × unit price).
/// </summary>
public record CreateRenovationPurchaseRequest(
    [StringLength(200, ErrorMessage = "Vendor must be 200 characters or less.")]
    string? Vendor,
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
    decimal Amount);
