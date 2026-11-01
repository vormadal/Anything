using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

/// <param name="ProductUrl">Absolute http(s) link to the product page; anything else is rejected.</param>
public record SaveRenovationMaterialRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be 1–200 characters.")]
    string Name,
    [Required(ErrorMessage = "Category is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Category must be 1–100 characters.")]
    string Category,
    [Required(ErrorMessage = "Unit is required.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "Unit must be 1–20 characters.")]
    string Unit,
    [Range(typeof(decimal), "0", "100000000", ErrorMessage = "Default price must be between 0 and 100,000,000.")]
    decimal DefaultPrice,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Waste must be between 0 and 100%.")]
    decimal WastePercent,
    [Range(typeof(decimal), "0", "1000000", ErrorMessage = "Pack size must be between 0 and 1,000,000.")]
    decimal? PackSize,
    [StringLength(500, ErrorMessage = "Product URL must be 500 characters or less.")]
    string? ProductUrl);

public record RenovationMaterialResponse(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal DefaultPrice,
    decimal WastePercent,
    decimal? PackSize,
    string? ProductUrl,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
