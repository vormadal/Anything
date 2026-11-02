namespace Anything.Core.Entities;

/// <summary>
/// A household's own version of a room type's template: either a customised built-in (same
/// <see cref="RoomType"/> as a built-in) or a custom room type. Built-ins stay in code as the
/// defaults, so a household only has a row once it has changed one. Its lines are
/// <see cref="RenovationRoomTemplateLine"/> rows, replaced wholesale on every save.
/// </summary>
public class RenovationRoomTemplate
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string RoomType { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Length { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public int Doors { get; set; }
    public int Windows { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
