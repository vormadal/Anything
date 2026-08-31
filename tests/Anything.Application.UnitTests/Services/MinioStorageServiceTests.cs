using System.Text.RegularExpressions;
using Anything.Application.Configuration;
using Anything.Application.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Services;

/// <summary>
/// Covers <see cref="MinioStorageService.GetImageUrl"/> — the only pure part of
/// the service (constructing it performs no I/O). Both source modes (legacy
/// plain HTTP vs private-bucket s3://) and both signing modes.
/// </summary>
public class MinioStorageServiceTests
{
    private const string StorageKey = "recipes/photo.png";

    private static MinioStorageService CreateService(
        bool useS3Source = false, string? proxyKey = null, string? proxySalt = null)
    {
        var settings = new ImageSettings
        {
            BucketName = "recipe-images",
            Endpoint = "http://localhost:9000",
            AccessKey = "access",
            SecretKey = "secret",
            MinioSourceEndpoint = "http://minio:9000",
            ImageProxyBaseUrl = "http://imgproxy:8080/",
            UseS3Source = useS3Source,
            ImageProxyKey = proxyKey,
            ImageProxySalt = proxySalt
        };

        return new MinioStorageService(
            Options.Create(settings), Substitute.For<ILogger<MinioStorageService>>());
    }

    [Fact]
    public void GetImageUrl_LegacyMode_UsesPlainMinioSource()
    {
        var url = CreateService().GetImageUrl(StorageKey, 300, 300);

        Assert.Equal(
            "http://imgproxy:8080/insecure/rs:fill:300:300/f:webp/plain/http://minio:9000/recipe-images/recipes/photo.png",
            url);
    }

    [Fact]
    public void GetImageUrl_S3Mode_UsesS3Source()
    {
        var url = CreateService(useS3Source: true).GetImageUrl(StorageKey, 300, 300);

        Assert.Equal(
            "http://imgproxy:8080/insecure/rs:fill:300:300/f:webp/plain/s3://recipe-images/recipes/photo.png",
            url);
    }

    [Fact]
    public void GetImageUrl_NonFillResizing_MapsToFit()
    {
        var url = CreateService().GetImageUrl(StorageKey, 1920, 1080, resizingType: "fit");

        Assert.Contains("/rs:fit:1920:1080/", url);
    }

    [Fact]
    public void GetImageUrl_WithSigningKeys_ReplacesInsecurePrefixWithSignature()
    {
        var url = CreateService(proxyKey: "aabbccdd", proxySalt: "eeff0011")
            .GetImageUrl(StorageKey, 300, 300);

        Assert.DoesNotContain("/insecure/", url);
        // base64url-encoded HMAC-SHA256 between the base URL and the processing path
        Assert.Matches(
            new Regex(@"^http://imgproxy:8080/[A-Za-z0-9_-]{43}/rs:fill:300:300/f:webp/plain/http://minio:9000/recipe-images/recipes/photo\.png$"),
            url);
    }

    [Theory]
    [InlineData(true)]  // private-bucket path: RemovePolicyAsync fails (no server) and is logged
    [InlineData(false)] // legacy path: SetPolicyAsync fails (no server) and is logged
    public async Task Initialize_WithUnreachableMinio_SwallowsPolicyFailure(bool useS3Source)
    {
        // Nothing listens on the configured endpoint; both policy calls' failures
        // must be caught and logged, never crash startup.
        var service = CreateService(useS3Source: useS3Source);

        await service.Initialize(ensureBucketExists: false, TestContext.Current.CancellationToken);
    }

    [Fact]
    public void GetImageUrl_SignatureIsDeterministicAndPathDependent()
    {
        var service = CreateService(proxyKey: "aabbccdd", proxySalt: "eeff0011");

        Assert.Equal(service.GetImageUrl(StorageKey, 300, 300), service.GetImageUrl(StorageKey, 300, 300));
        Assert.NotEqual(service.GetImageUrl(StorageKey, 300, 300), service.GetImageUrl(StorageKey, 600, 600));
    }
}
