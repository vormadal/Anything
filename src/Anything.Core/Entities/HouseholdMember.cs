namespace Anything.Core.Entities;

public class HouseholdMember
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public int UserId { get; set; }
    public required string Role { get; set; }
    public DateTime JoinedOn { get; set; }

    public Household? Household { get; set; }
}
