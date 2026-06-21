using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public enum ShareExpiry
{
    OneWeek,
    OneMonth,
    Forever
}

public record CreateRecipeShareRequest(
    ShareExpiry Expiry,
    [EmailAddress(ErrorMessage = "Target email must be a valid email address.")]
    string? TargetEmail = null
);
