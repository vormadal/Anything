namespace Anything.Core.Entities;

public class ShoppingList
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public ListType Type { get; set; } = ListType.Shopping;
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
