namespace Anything.Application.Configuration;

/// <summary>
/// Detects checked-in dev-default secrets so Program.cs can refuse to start
/// Production on them. Pure (no host or options plumbing) so every branch is
/// unit-testable; add any new secret's dev default here.
/// </summary>
public static class ProductionSecretsGuard
{
    public const string DevJwtSecretKey = "your-secret-key-min-32-characters-long-change-in-production";
    public const string DevAdminPassword = "Admin123!";
    public const string DevMinioSecretKey = "minioadmin";

    public static IReadOnlyList<string> FindDevDefaults(JwtSettings jwt, AdminSettings admin, ImageSettings images)
    {
        var errors = new List<string>();

        if (jwt.SecretKey == DevJwtSecretKey)
            errors.Add("Jwt:SecretKey is the checked-in dev default — set a real secret via environment variables.");

        if (admin.Password == DevAdminPassword)
            errors.Add("Admin:Password is the checked-in dev default — set a real password via environment variables.");

        if (images.SecretKey == DevMinioSecretKey)
            errors.Add("ImageSettings:SecretKey is the checked-in dev default — set real MinIO credentials via environment variables.");

        if (string.IsNullOrEmpty(images.ImageProxyKey) || string.IsNullOrEmpty(images.ImageProxySalt))
            errors.Add("ImageSettings:ImageProxyKey/ImageProxySalt are unset — without them image URLs are unsigned (/insecure), an open resizer. Set both (hex) and configure imgproxy with the same IMGPROXY_KEY/IMGPROXY_SALT.");

        return errors;
    }
}
