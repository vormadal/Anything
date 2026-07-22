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
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }

    string ISearchable.SearchEntityType => SearchEntityTypes.InventoryItem;
    int ISearchable.SearchEntityId => Id;
    string ISearchable.SearchTitle => Name;
    string ISearchable.SearchContent => Description is null ? Name : $"{Name} {Description}";
}
