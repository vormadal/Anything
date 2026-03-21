namespace Anything.Core.Entities;

public class BillAttachment
{
    public int Id { get; set; }
    public int BillId { get; set; }
    public required string StorageKey { get; set; }
    public required string Name { get; set; }
    public required string ContentType { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
