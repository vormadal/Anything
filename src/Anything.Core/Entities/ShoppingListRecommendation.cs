namespace Anything.Core.Entities;

public class ShoppingListRecommendation
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public string? PreferredUnit { get; set; }
    public int? CategoryId { get; set; }
    public SuggestionCategory? Category { get; set; }

    /// <summary>
    /// Whether this recommendation appears in the add-box autocomplete suggestions.
    /// Recipe-seeded recommendations are created hidden (false): they can still carry a
    /// category so items sort into the right section, but never clutter the suggestions.
    /// </summary>
    public bool IncludeInSuggestions { get; set; } = true;
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
