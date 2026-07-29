namespace Anything.Core.Entities;

public class InventoryBox
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int Number { get; set; }
    public string? Label { get; set; }
    public string? Description { get; set; }
    public int? StorageUnitId { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
