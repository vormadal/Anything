using Anything.Core.Search;

namespace Anything.Core.Entities;

/// <summary>
/// A household-wide material or service with default pricing. Lines copy its price when it is
/// chosen, so changing a default later never silently re-prices an existing line.
/// </summary>
public class RenovationMaterial : ISearchable
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal DefaultPrice { get; set; }
    public decimal WastePercent { get; set; }
    public decimal? PackSize { get; set; }
    public string? ProductUrl { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }

    string ISearchable.SearchEntityType => SearchEntityTypes.RenovationMaterial;
    int ISearchable.SearchEntityId => Id;
    string ISearchable.SearchTitle => Name;

    // Searchable by category, unit and the product page's host, not the full URL, whose path is
    // noise for someone searching their own material list.
    string ISearchable.SearchContent => SearchDocumentLimits.Truncate(
        string.Join(" ", new[] { Category, Unit, ProductHost() }.Where(part => !string.IsNullOrWhiteSpace(part))),
        SearchDocumentLimits.MaxContentLength);

    private string? ProductHost() =>
        Uri.TryCreate(ProductUrl, UriKind.Absolute, out var uri) ? uri.Host : null;
}
