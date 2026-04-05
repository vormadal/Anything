namespace Anything.Contracts.Households;

public record HouseholdMemberResponse(
    int UserId,
    string Name,
    string Email,
    string Role,
    DateTime JoinedOn);
