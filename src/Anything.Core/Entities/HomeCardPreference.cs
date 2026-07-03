namespace Anything.Core.Entities;

public class HomeCardPreference
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int UserId { get; set; }
    public required string CardKey { get; set; }
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
