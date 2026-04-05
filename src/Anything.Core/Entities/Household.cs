namespace Anything.Core.Entities;

public class Household
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
