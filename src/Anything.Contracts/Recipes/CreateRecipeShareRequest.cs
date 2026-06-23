using System.Text.Json.Serialization;

namespace Anything.Contracts.Recipes;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShareExpiry
{
    OneWeek,
    OneMonth,
    Forever
}

public record CreateRecipeShareRequest(
    ShareExpiry Expiry,
    string? TargetEmail = null
);
