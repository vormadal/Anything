namespace Anything.Core.Entities;

public class ShoppingListRecommendation
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? PreferredUnit { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
