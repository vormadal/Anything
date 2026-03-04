namespace Anything.Core.Entities;

public class InventoryStorageUnit
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Type { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
