namespace Anything.Core.Entities;

public class ShoppingList
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public ListType Type { get; set; } = ListType.Shopping;

    /// <summary>When true, this list is a reusable template rather than an active list.</summary>
    public bool IsTemplate { get; set; }

    /// <summary>The template this list was created from, if any. Enables tracing a list back to its template.</summary>
    public int? SourceTemplateId { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
