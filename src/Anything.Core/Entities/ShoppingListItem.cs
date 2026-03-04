namespace Anything.Core.Entities;

public class ShoppingListItem
{
    public int Id { get; set; }
    public int ShoppingListId { get; set; }
    public required string Name { get; set; }
    public bool IsChecked { get; set; }
    public decimal? Amount { get; set; }
    public string? Unit { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
