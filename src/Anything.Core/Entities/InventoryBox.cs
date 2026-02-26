namespace Anything.Core.Entities;

public class InventoryBox
{
    public int Id { get; set; }
    public int Number { get; set; }
    public int? StorageUnitId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
