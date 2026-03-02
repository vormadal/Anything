namespace Anything.Application.Configuration;

public class ImageSettings
{
    public const string SectionName = "ImageSettings";

    public required string BucketName { get; init; }
    public required string Endpoint { get; init; }
    public required string AccessKey { get; init; }
    public required string SecretKey { get; init; }
    public bool UseSSL { get; init; } = false;

    public required string ImgproxyBaseUrl { get; init; }
    public required string ImgproxyKey { get; init; }
    public required string ImgproxySalt { get; init; }
}
