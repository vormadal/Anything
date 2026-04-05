namespace Anything.Contracts.Households;

public record HouseholdResponse(
    int Id,
    string Name,
    DateTime CreatedOn,
    string Role);
