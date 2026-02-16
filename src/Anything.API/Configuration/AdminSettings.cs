namespace Anything.API.Configuration;

public class AdminSettings
{
    public const string SectionName = "Admin";

    public string? Email { get; init; }
    public string? Password { get; init; }
}
