namespace Anything.Core.Services;

public interface IHouseholdContext
{
    int HouseholdId { get; }

    string? Role { get; }
}
