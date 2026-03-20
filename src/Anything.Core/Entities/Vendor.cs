namespace Anything.Core.Entities;

public class Vendor
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Website { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
