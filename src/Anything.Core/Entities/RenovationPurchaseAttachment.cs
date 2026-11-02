namespace Anything.Core.Entities;

/// <summary>
/// A receipt, warranty card or other file kept against one renovation purchase. Shaped like
/// <see cref="BillAttachment"/>, plus the household and size, so every read can be scoped on its own row.
/// </summary>
public class RenovationPurchaseAttachment
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int PurchaseId { get; set; }
    public required string StorageKey { get; set; }
    public required string Name { get; set; }
    public required string ContentType { get; set; }
    public long Size { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
