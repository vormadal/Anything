using Anything.Application.Configuration;
using Xunit;

namespace Anything.Application.UnitTests.Configuration;

public class ProductionSecretsGuardTests
{
    // Stands in for whatever the checked-in appsettings.json currently holds —
    // the guard only cares whether the configured value still matches it, not
    // what the value actually is.
    private static ProductionSecretsSnapshot Baseline() => new(
        JwtSecretKey: "baseline-jwt-value",
        AdminPassword: "baseline-admin-value",
        MinioSecretKey: "baseline-minio-value",
        ImageProxyKey: null,
        ImageProxySalt: null);

    private static ProductionSecretsSnapshot OverriddenValues() => new(
        JwtSecretKey: "overridden-jwt-value",
        AdminPassword: "overridden-admin-value",
        MinioSecretKey: "overridden-minio-value",
        ImageProxyKey: "aabbcc",
        ImageProxySalt: "ddeeff");

    [Fact]
    public void FindDevDefaults_WithOverriddenValues_ReturnsNoErrors() =>
        Assert.Empty(ProductionSecretsGuard.FindDevDefaults(OverriddenValues(), Baseline()));

    [Fact]
    public void FindDevDefaults_WithJwtSecretUnchangedFromBaseline_FlagsIt()
    {
        var configured = OverriddenValues() with { JwtSecretKey = Baseline().JwtSecretKey };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.Contains(errors, e => e.Contains("Jwt:SecretKey"));
    }

    [Fact]
    public void FindDevDefaults_WithAdminPasswordUnchangedFromBaseline_FlagsIt()
    {
        var configured = OverriddenValues() with { AdminPassword = Baseline().AdminPassword };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.Contains(errors, e => e.Contains("Admin:Password"));
    }

    [Fact]
    public void FindDevDefaults_WithMinioSecretUnchangedFromBaseline_FlagsIt()
    {
        var configured = OverriddenValues() with { MinioSecretKey = Baseline().MinioSecretKey };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.Contains(errors, e => e.Contains("ImageSettings:SecretKey"));
    }

    [Fact]
    public void FindDevDefaults_WithUnsetAdminPassword_DoesNotFlagIt()
    {
        var configured = OverriddenValues() with { AdminPassword = null };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.DoesNotContain(errors, e => e.Contains("Admin:Password"));
    }

    [Fact]
    public void FindDevDefaults_WithNoBaselineToCompareAgainst_DoesNotFlagRealValues()
    {
        // appsettings.json missing at runtime (see Program.cs's `optional: true`) —
        // nothing to compare against, so a real configured secret isn't flagged.
        var missingBaseline = new ProductionSecretsSnapshot(null, null, null, "aabbcc", "ddeeff");

        Assert.Empty(ProductionSecretsGuard.FindDevDefaults(OverriddenValues(), missingBaseline));
    }

    [Theory]
    [InlineData(null, "ddeeff")]
    [InlineData("aabbcc", null)]
    [InlineData("", "")]
    public void FindDevDefaults_WithMissingImgproxyKeys_FlagsIt(string? proxyKey, string? proxySalt)
    {
        var configured = OverriddenValues() with { ImageProxyKey = proxyKey, ImageProxySalt = proxySalt };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.Contains(errors, e => e.Contains("ImageProxyKey"));
    }

    [Fact]
    public void FindDevDefaults_WithEveryValueUnchanged_ReturnsAllErrors()
    {
        var configured = Baseline() with { ImageProxyKey = null, ImageProxySalt = null };

        var errors = ProductionSecretsGuard.FindDevDefaults(configured, Baseline());

        Assert.Equal(4, errors.Count);
    }
}
