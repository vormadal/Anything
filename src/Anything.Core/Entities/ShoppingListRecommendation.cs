namespace Anything.Core.Entities;

public class ShoppingListRecommendation
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }

    /// <summary>
    /// The list this suggestion belongs to. <c>null</c> means the suggestion is
    /// shared across every shopping list in the household (the legacy/global scope):
    /// shared suggestions surface in every list's autocomplete, while a non-null
    /// value restricts the suggestion to that one list.
    /// </summary>
    public int? ShoppingListId { get; set; }
    public ShoppingList? ShoppingList { get; set; }
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
