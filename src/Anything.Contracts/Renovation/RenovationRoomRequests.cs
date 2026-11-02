using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Renovation;

/// <param name="RoomType">
/// A key from <c>GET /api/renovation-room-templates</c> (e.g. <c>kitchen</c>). The template's
/// lines are added to the new room.
/// </param>
/// <param name="LineKeys">Template line keys to add. Null adds the template's default selection.</param>
public record CreateRenovationRoomRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be 1–200 characters.")]
    string Name,
    [Required(ErrorMessage = "Room type is required.")]
    [StringLength(50, ErrorMessage = "Room type must be 50 characters or less.")]
    string RoomType,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Length must be between 0 and 1000 m.")]
    decimal Length,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Width must be between 0 and 1000 m.")]
    decimal Width,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Height must be between 0 and 100 m.")]
    decimal Height,
    [Range(0, 100, ErrorMessage = "Doors must be between 0 and 100.")]
    int Doors,
    [Range(0, 100, ErrorMessage = "Windows must be between 0 and 100.")]
    int Windows,
    [MaxLength(100, ErrorMessage = "At most 100 lines.")]
    List<string>? LineKeys);

public record UpdateRenovationRoomRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be 1–200 characters.")]
    string Name,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Length must be between 0 and 1000 m.")]
    decimal Length,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Width must be between 0 and 1000 m.")]
    decimal Width,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Height must be between 0 and 100 m.")]
    decimal Height,
    [Range(0, 100, ErrorMessage = "Doors must be between 0 and 100.")]
    int Doors,
    [Range(0, 100, ErrorMessage = "Windows must be between 0 and 100.")]
    int Windows);

/// <summary>
/// Replaces this household's version of a room type (<c>PUT /api/renovation-room-templates/{roomType}</c>).
/// Creates the household's row on first save; afterwards the fields and every line are replaced.
/// Lines take their order from the array.
/// </summary>
public record SaveRenovationRoomTemplateRequest(
    [Required(ErrorMessage = "Label is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Label must be 1–100 characters.")]
    string Label,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Length must be between 0 and 1000 m.")]
    decimal Length,
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Width must be between 0 and 1000 m.")]
    decimal Width,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Height must be between 0 and 100 m.")]
    decimal Height,
    [Range(0, 100, ErrorMessage = "Doors must be between 0 and 100.")]
    int Doors,
    [Range(0, 100, ErrorMessage = "Windows must be between 0 and 100.")]
    int Windows,
    [Required(ErrorMessage = "Lines are required.")]
    [MaxLength(100, ErrorMessage = "At most 100 lines.")]
    List<SaveRenovationTemplateLineRequest> Lines);

/// <param name="Key">Unique within the template. Rooms refer to lines by this key.</param>
/// <param name="Basis">One of Floor, Wall, Ceiling, Perimeter, FloorAndWall, Doors, Fixed.</param>
/// <param name="FixedQuantity">Required when <paramref name="Basis"/> is Fixed; ignored otherwise.</param>
public record SaveRenovationTemplateLineRequest(
    [Required(ErrorMessage = "Key is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Key must be 1–50 characters.")]
    string Key,
    [Required(ErrorMessage = "Label is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Label must be 1–200 characters.")]
    string Label,
    [Required(ErrorMessage = "Group is required.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Group must be 1–50 characters.")]
    string Group,
    [Required(ErrorMessage = "Material name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Material name must be 1–200 characters.")]
    string MaterialName,
    [Required(ErrorMessage = "Category is required.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Category must be 1–100 characters.")]
    string Category,
    [Required(ErrorMessage = "Basis is required.")]
    [StringLength(50, ErrorMessage = "Basis must be 50 characters or less.")]
    string Basis,
    [Required(ErrorMessage = "Unit is required.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "Unit must be 1–20 characters.")]
    string Unit,
    [Range(typeof(decimal), "0", "100000000", ErrorMessage = "Default price must be between 0 and 100,000,000.")]
    decimal DefaultPrice,
    [Range(typeof(decimal), "0", "100", ErrorMessage = "Waste must be between 0 and 100%.")]
    decimal WastePercent,
    [Range(typeof(decimal), "0", "1000000", ErrorMessage = "Fixed quantity must be between 0 and 1,000,000.")]
    decimal? FixedQuantity,
    bool EnabledByDefault = true);
