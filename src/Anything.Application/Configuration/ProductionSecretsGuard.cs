using System.Security.Cryptography;
using System.Text;

namespace Anything.Application.Configuration;

/// <summary>
/// Detects checked-in dev-default secrets so Program.cs can refuse to start
/// Production on them. Pure (no host or options plumbing) so every branch is
/// unit-testable. The defaults are recognized by SHA-256 hash — the plaintexts
/// live only in appsettings.json, so this source carries no credential strings.
/// Add any new secret's dev-default hash here.
/// </summary>
public static class ProductionSecretsGuard
{
    // SHA-256 (uppercase hex) of the dev defaults in appsettings.json.
    private const string DevJwtSecretKeySha256 = "360600F0C7D3CD42A71DF0136A2514E2B41B42C83C95209CE71BA7AEF13F1E87";
    private const string DevAdminPasswordSha256 = "3EB3FE66B31E3B4D10FA70B5CAD49C7112294AF6AE4E476A1C405155D45AA121";
    private const string DevMinioSecretKeySha256 = "AD9858116E63B0C5A4D7DC7F50F034C7247E56838DAE22C1832712FFDE48E694";

    public static IReadOnlyList<string> FindDevDefaults(JwtSettings jwt, AdminSettings admin, ImageSettings images)
    {
        var errors = new List<string>();

        if (IsDevDefault(jwt.SecretKey, DevJwtSecretKeySha256))
            errors.Add("Jwt:SecretKey is the checked-in dev default — set a real secret via environment variables.");

        if (IsDevDefault(admin.Password, DevAdminPasswordSha256))
            errors.Add("Admin:Password is the checked-in dev default — set a real password via environment variables.");

        if (IsDevDefault(images.SecretKey, DevMinioSecretKeySha256))
            errors.Add("ImageSettings:SecretKey is the checked-in dev default — set real MinIO credentials via environment variables.");

        if (string.IsNullOrEmpty(images.ImageProxyKey) || string.IsNullOrEmpty(images.ImageProxySalt))
            errors.Add("ImageSettings:ImageProxyKey/ImageProxySalt are unset — without them image URLs are unsigned (/insecure), an open resizer. Set both (hex) and configure imgproxy with the same IMGPROXY_KEY/IMGPROXY_SALT.");

        return errors;
    }

    private static bool IsDevDefault(string? configuredValue, string devDefaultSha256) =>
        configuredValue is not null
        && Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(configuredValue))) == devDefaultSha256;
}
