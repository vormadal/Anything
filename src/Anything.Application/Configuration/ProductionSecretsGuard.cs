namespace Anything.Application.Configuration;

/// <summary>
/// The subset of appsettings values Program.cs's startup guard cares about.
/// Deliberately holds no literal secret text — see <see cref="ProductionSecretsGuard"/>.
/// </summary>
public sealed record ProductionSecretsSnapshot(
    string? JwtSecretKey,
    string? AdminPassword,
    string? MinioSecretKey,
    string? ImageProxyKey,
    string? ImageProxySalt);

/// <summary>
/// Detects secrets that were never overridden from the checked-in
/// appsettings.json defaults, so Program.cs can refuse to start Production on
/// them. Deliberately takes two snapshots (the bound configuration, and a
/// fresh read of the base appsettings.json — see Program.cs) rather than
/// comparing against an embedded literal: a hard-coded copy of the dev secret
/// (plaintext or hashed) is itself what static analysis flags as a
/// "hard-coded secret", so the only value this class ever holds is whatever
/// the deployment's own config file contains at runtime.
/// </summary>
public static class ProductionSecretsGuard
{
    public static IReadOnlyList<string> FindDevDefaults(
        ProductionSecretsSnapshot configured, ProductionSecretsSnapshot baseline)
    {
        var errors = new List<string>();

        if (UnchangedFromBaseline(configured.JwtSecretKey, baseline.JwtSecretKey))
            errors.Add("Jwt:SecretKey is unchanged from the checked-in appsettings.json default — set a real secret via environment variables.");

        if (UnchangedFromBaseline(configured.AdminPassword, baseline.AdminPassword))
            errors.Add("Admin:Password is unchanged from the checked-in appsettings.json default — set a real password via environment variables.");

        if (UnchangedFromBaseline(configured.MinioSecretKey, baseline.MinioSecretKey))
            errors.Add("ImageSettings:SecretKey is unchanged from the checked-in appsettings.json default — set real MinIO credentials via environment variables.");

        if (string.IsNullOrEmpty(configured.ImageProxyKey) || string.IsNullOrEmpty(configured.ImageProxySalt))
            errors.Add("ImageSettings:ImageProxyKey/ImageProxySalt are unset — without them image URLs are unsigned (/insecure), an open resizer. Set both (hex) and configure imgproxy with the same IMGPROXY_KEY/IMGPROXY_SALT.");

        return errors;
    }

    private static bool UnchangedFromBaseline(string? configuredValue, string? baselineValue) =>
        !string.IsNullOrEmpty(configuredValue) && configuredValue == baselineValue;
}
