namespace Anything.Core.Entities;

public class InventoryBox
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int Number { get; set; }
    public int? StorageUnitId { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
