using Anything.Application.Configuration;
using Anything.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Anything.Application.Services;

public class MinioStorageService : IImageStorageService
{
    private const string PublicReadPolicyTemplate =
        """{{\"Version\":\"2012-10-17\",\"Statement\":[{{\"Effect\":\"Allow\",\"Principal\":{{\"AWS\":[\"*\"]}},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::{0}/*\"]}}]}}""";

    private readonly ImageSettings _settings;
    private readonly IMinioClient _client;
    private readonly ILogger<MinioStorageService> _logger;

    public MinioStorageService(IOptions<ImageSettings> settings, ILogger<MinioStorageService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
        var uri = new Uri(_settings.Endpoint);
        var builder = new MinioClient()
            .WithEndpoint(uri.Host, uri.Port)
            .WithCredentials(_settings.AccessKey, _settings.SecretKey);
        if (_settings.UseSSL)
            builder = builder.WithSSL();
        _client = builder.Build();
    }

    public async Task Initialize(CancellationToken ct = default)
    {
        var policy = string.Format(PublicReadPolicyTemplate, _settings.BucketName);
        try
        {
            await _client.SetPolicyAsync(new SetPolicyArgs()
                .WithBucket(_settings.BucketName)
                .WithPolicy(policy));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set bucket policy for {BucketName}. The bucket may not exist yet or credentials may be incorrect.", _settings.BucketName);
        }
    }

    public async Task<string> Upload(Stream stream, string fileName, string contentType,
        long contentLength, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(fileName);
        var objectKey = $"recipes/{Guid.NewGuid()}{extension}";

        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(contentLength)
            .WithContentType(contentType), ct);

        return objectKey;
    }

    public string GetImageUrl(string storageKey, int width, int height, string resizingType = "fill")
    {
        var sourceUrl = $"{_settings.MinioSourceEndpoint.TrimEnd('/')}/{_settings.BucketName}/{storageKey}";
        var resize = resizingType == "fill" ? "fill" : "fit";
        return $"{_settings.ImageProxyBaseUrl.TrimEnd('/')}/insecure/rs:{resize}:{width}:{height}/f:webp/plain/{sourceUrl}";
    }

    public async Task Delete(string storageKey, CancellationToken ct = default)
    {
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(storageKey), ct);
    }
}
