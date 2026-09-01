using System.ComponentModel.DataAnnotations;

namespace Anything.Application.Configuration;

public class ImageSettings
{
    public const string SectionName = "ImageSettings";

    // MinIO connection (API → MinIO for uploads/deletes)
    [Required]
    public required string BucketName { get; init; }
    [Required]
    public required string Endpoint { get; init; }
    [Required]
    public required string AccessKey { get; init; }
    [Required]
    public required string SecretKey { get; init; }
    public bool UseSSL { get; init; } = false;

    // The MinIO endpoint as seen from the image proxy's Docker network (used in
    // image source URLs when UseS3Source is false)
    [Required]
    public required string MinioSourceEndpoint { get; init; }

    // When true, the bucket is kept private (no anonymous-read policy) and
    // imgproxy source URLs use s3://bucket/key — imgproxy must then be deployed
    // with S3 credentials (IMGPROXY_USE_S3 etc.). When false (legacy), the
    // bucket is made public-read and sources are plain MinIO HTTP URLs.
    public bool UseS3Source { get; init; } = false;

    // Image proxy base URL (for constructing resized image URLs)
    [Required]
    public required string ImageProxyBaseUrl { get; init; }

    // imgproxy URL signing (hex-encoded). When empty, URLs use /insecure/ prefix.
    public string? ImageProxyKey { get; init; }
    public string? ImageProxySalt { get; init; }
}
