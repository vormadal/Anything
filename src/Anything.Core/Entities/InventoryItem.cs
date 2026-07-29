using Anything.Core.Search;

namespace Anything.Core.Entities;

public class InventoryItem : ISearchable
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int? BoxId { get; set; }
    public int? StorageUnitId { get; set; }
    public int? Quantity { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public DateTime? PurchasedOn { get; set; }
    public decimal? PurchasePrice { get; set; }
    public DateTime? WarrantyExpiresOn { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }

    string ISearchable.SearchEntityType => SearchEntityTypes.InventoryItem;
    int ISearchable.SearchEntityId => Id;
    string ISearchable.SearchTitle => Name;

    // Brand/model/serial/notes are unbounded in combination, and the
    // interceptor writes this row in a second save that runs after the user's
    // own write has already committed — overflowing here would fail indexing
    // on an otherwise successful save. See SearchDocumentLimits.
    string ISearchable.SearchContent => SearchDocumentLimits.Truncate(
        string.Join(" ", new[] { Name, Description, Brand, Model, SerialNumber, Notes }
            .Where(part => !string.IsNullOrWhiteSpace(part))),
        SearchDocumentLimits.MaxContentLength);
}
