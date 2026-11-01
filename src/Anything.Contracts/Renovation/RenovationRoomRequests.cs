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
