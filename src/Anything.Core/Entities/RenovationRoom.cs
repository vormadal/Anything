namespace Anything.Core.Entities;

/// <summary>
/// A room in a renovation project. Its dimensions drive the quantity of every
/// area/length-based <see cref="RenovationLine"/> in it.
/// </summary>
public class RenovationRoom
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RoomType { get; set; } = string.Empty;
    public decimal Length { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public int Doors { get; set; }
    public int Windows { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
