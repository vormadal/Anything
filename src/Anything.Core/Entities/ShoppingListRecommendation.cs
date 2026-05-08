namespace Anything.Core.Entities;

public class ShoppingListRecommendation
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public string? PreferredUnit { get; set; }
    public int? CategoryId { get; set; }
    public SuggestionCategory? Category { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
