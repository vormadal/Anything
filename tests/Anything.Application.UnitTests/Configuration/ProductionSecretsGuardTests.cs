using Anything.Application.Configuration;
using Xunit;

namespace Anything.Application.UnitTests.Configuration;

public class ProductionSecretsGuardTests
{
    private static JwtSettings Jwt(string secretKey = "a-real-secret-key-with-enough-length") => new()
    {
        SecretKey = secretKey,
        Issuer = "issuer",
        Audience = "audience"
    };

    private static AdminSettings Admin(string? password = "a-real-password") => new()
    {
        Email = "admin@example.com",
        Password = password
    };

    private static ImageSettings Images(
        string secretKey = "a-real-minio-secret",
        string? proxyKey = "aabbcc",
        string? proxySalt = "ddeeff") => new()
    {
        BucketName = "bucket",
        Endpoint = "http://minio:9000",
        AccessKey = "access",
        SecretKey = secretKey,
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
            Jwt(ProductionSecretsGuard.DevJwtSecretKey), Admin(), Images());

        Assert.Contains(errors, e => e.Contains("Jwt:SecretKey"));
    }

    [Fact]
    public void FindDevDefaults_WithDefaultAdminPassword_FlagsIt()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(), Admin(ProductionSecretsGuard.DevAdminPassword), Images());

        Assert.Contains(errors, e => e.Contains("Admin:Password"));
    }

    [Fact]
    public void FindDevDefaults_WithDefaultMinioSecret_FlagsIt()
    {
        var errors = ProductionSecretsGuard.FindDevDefaults(
            Jwt(), Admin(), Images(secretKey: ProductionSecretsGuard.DevMinioSecretKey));

        Assert.Contains(errors, e => e.Contains("ImageSettings:SecretKey"));
    }

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
            Jwt(ProductionSecretsGuard.DevJwtSecretKey),
            Admin(ProductionSecretsGuard.DevAdminPassword),
            Images(secretKey: ProductionSecretsGuard.DevMinioSecretKey, proxyKey: null, proxySalt: null));

        Assert.Equal(4, errors.Count);
    }
}
