namespace Anything.Contracts.Households;

public record HouseholdDetailResponse(
    int Id,
    string Name,
    DateTime CreatedOn,
    List<HouseholdMemberResponse> Members);
