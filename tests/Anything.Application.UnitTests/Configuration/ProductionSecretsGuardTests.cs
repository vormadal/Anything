using Anything.Application.Configuration;
using Xunit;

namespace Anything.Application.UnitTests.Configuration;

public class ProductionSecretsGuardTests
{
    // The dev defaults checked into appsettings.json, in the order
    // Jwt:SecretKey, Admin:Password, ImageSettings:SecretKey. The guard stores
    // only their SHA-256 hashes, so these tests prove the plaintexts are
    // still recognized.
    private static readonly string[] AppsettingsDevDefaults =
    [
        "your-secret-key-min-32-characters-long-change-in-production",
        "Admin123!",
        "minioadmin"
    ];

    private static JwtSettings Jwt(string configured = "a-real-value-with-enough-length") => new()
    {
        SecretKey = configured,
        Issuer = "issuer",
        Audience = "audience"
    };

    private static AdminSettings Admin(string? configured = "a-real-value") => new()
    {
        Email = "admin@example.com",
        Password = configured
    };

    private static ImageSettings Images(
        string configuredSecret = "a-real-minio-value",
        string? proxyKey = "aabbcc",
        string? proxySalt = "ddeeff") => new()
    {
        BucketName = "bucket",
        Endpoint = "http://minio:9000",
        AccessKey = "access",
        SecretKey = configuredSecret,
        MinioSourceEndpoint = "http://minio:9000",
        ImageProxyBaseUrl = "http://imgproxy:8080",
        ImageProxyKey = proxyKey,
        ImageProxySalt = proxySalt
    };

    [Fact]
    public void FindDevDefaults_WithRealSecrets_ReturnsNoErrors() =>
        Assert.Empty(ProductionSecretsGuard.FindDevDefaults(Jwt(), Admin(), Images()));

    [Fact]
    public void FindDevDefaults_WithDefaultJwtSecret_FlagsIt()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(AppsettingsDevDefaults[0]), Admin(), Images());

        Assert.Contains(errors, e => e.Contains("Jwt:SecretKey"));
    }

    [Fact]
    public void FindDevDefaults_WithDefaultAdminPassword_FlagsIt()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(), Admin(AppsettingsDevDefaults[1]), Images());

        Assert.Contains(errors, e => e.Contains("Admin:Password"));
    }

    [Fact]
    public void FindDevDefaults_WithDefaultMinioSecret_FlagsIt()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(), Admin(), Images(configuredSecret: AppsettingsDevDefaults[2]));

        Assert.Contains(errors, e => e.Contains("ImageSettings:SecretKey"));
    }

    [Fact]
    public void FindDevDefaults_WithUnsetAdminPassword_DoesNotFlagIt() =>
        Assert.Empty(ProductionSecretsGuard.FindDevDefaults(Jwt(), Admin(configured: null), Images()));

    [Theory]
    [InlineData(null, "ddeeff")]
    [InlineData("aabbcc", null)]
    [InlineData("", "")]
    public void FindDevDefaults_WithMissingImgproxyKeys_FlagsIt(string? proxyKey, string? proxySalt)
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(), Admin(), Images(proxyKey: proxyKey, proxySalt: proxySalt));

        Assert.Contains(errors, e => e.Contains("ImageProxyKey"));
    }

    [Fact]
    public void FindDevDefaults_WithEveryDefault_ReturnsAllErrors()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(AppsettingsDevDefaults[0]),
            Admin(AppsettingsDevDefaults[1]),
            Images(configuredSecret: AppsettingsDevDefaults[2], proxyKey: null, proxySalt: null));

        Assert.Equal(4, errors.Count);
    }
}
