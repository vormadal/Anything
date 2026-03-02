namespace Anything.Application.Configuration;

public class ImageSettings
{
    public const string SectionName = "ImageSettings";

    // MinIO connection (API → MinIO for uploads/deletes)
    public required string BucketName { get; init; }
    public required string Endpoint { get; init; }
    public required string AccessKey { get; init; }
    public required string SecretKey { get; init; }
    public bool UseSSL { get; init; } = false;

    // The MinIO endpoint as seen from Imaginary's Docker network (used in image source URLs)
    public required string MinioSourceEndpoint { get; init; }

    // Imaginary base URL (for constructing resized image URLs)
    public required string ImaginaryBaseUrl { get; init; }
}
