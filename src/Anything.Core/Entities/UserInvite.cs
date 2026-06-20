namespace Anything.Core.Entities;

public class UserInvite
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedOn { get; set; }
    public bool IsUsed { get; set; }
    public int? HouseholdId { get; set; }
}
