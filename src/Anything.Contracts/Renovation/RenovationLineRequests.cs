using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

/// <summary>
/// Create or replace a budget line. To swap the material, send the new <c>MaterialId</c> along
/// with its name, unit, price and waste — the line keeps its own copy so a later change to the
/// material's default price never re-prices it silently.
/// </summary>
/// <param name="Basis">One of Floor, Wall, Ceiling, Perimeter, FloorAndWall, Doors, Fixed.</param>
/// <param name="FixedQuantity">Required when <paramref name="Basis"/> is Fixed; ignored otherwise.</param>
public record SaveRenovationLineRequest(
    [Required(ErrorMessage = "Label is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Label must be 1–200 characters.")]
    string Label,
    [Required(ErrorMessage = "Group is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Group must be 1–50 characters.")]
    string Group,
    int? MaterialId,
    [Required(ErrorMessage = "Description is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Description must be 1–200 characters.")]
    string Description,
    [Required(ErrorMessage = "Basis is required.")]
    [StringLength(50, ErrorMessage = "Basis must be 50 characters or less.")]
    string Basis,
    [Range(typeof(decimal), "0", "1000000", ErrorMessage = "Fixed quantity must be between 0 and 1,000,000.")]
    decimal? FixedQuantity,
    [Required(ErrorMessage = "Unit is required.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "Unit must be 1–20 characters.")]
    string Unit,
    [Range(typeof(decimal), "0", "100000000", ErrorMessage = "Unit price must be between 0 and 100,000,000.")]
    decimal UnitPrice,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Waste must be between 0 and 100%.")]
    decimal WastePercent,
    bool IsComplete = false);

/// <summary>
/// Point every not-yet-purchased line in the project that uses <paramref name="FromMaterialId"/>
/// at <paramref name="ToMaterialId"/>, copying its name, unit, price and waste.
/// Lines with any recorded purchase are left alone.
/// </summary>
public record ReplaceRenovationMaterialRequest(
    [Range(1, int.MaxValue, ErrorMessage = "From material is required.")]
    int FromMaterialId,
    [Range(1, int.MaxValue, ErrorMessage = "To material is required.")]
    int ToMaterialId);

public record ReplaceRenovationMaterialResponse(int UpdatedLines, int SkippedPurchasedLines);
