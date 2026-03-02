using System.Security.Cryptography;
using System.Text;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Anything.Application.Configuration;
using Anything.Core.Services;
using Microsoft.Extensions.Options;

namespace Anything.Application.Services;

public class MinioStorageService : IImageStorageService
{
    private readonly ImageSettings _settings;
    private readonly IAmazonS3 _s3;

    public MinioStorageService(IOptions<ImageSettings> settings)
    {
        _settings = settings.Value;

        var config = new AmazonS3Config
        {
            ServiceURL = _settings.Endpoint,
            ForcePathStyle = true,
            UseHttp = !_settings.UseSSL
        };

        _s3 = new AmazonS3Client(
            new BasicAWSCredentials(_settings.AccessKey, _settings.SecretKey),
            config);
    }

    public async Task<string> Upload(Stream stream, string fileName,
        string contentType, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(fileName);
        var objectKey = $"recipes/{Guid.NewGuid()}{extension}";

        var request = new PutObjectRequest
        {
            BucketName = _settings.BucketName,
            Key = objectKey,
            InputStream = stream,
            ContentType = contentType,
            DisablePayloadSigning = true
        };

        await _s3.PutObjectAsync(request, ct);
        return objectKey;
    }

    public string GetImageUrl(string storageKey, int width, int height,
        string resizingType = "fill")
    {
        var processingOptions = $"rs:{resizingType}:{width}:{height}";
        var sourcePath = $"s3://{_settings.BucketName}/{storageKey}";
        var path = $"/{processingOptions}/plain/{sourcePath}";

        var keyBytes = Convert.FromHexString(_settings.ImgproxyKey);
        var saltBytes = Convert.FromHexString(_settings.ImgproxySalt);

        using var hmac = new HMACSHA256(keyBytes);
        var dataToSign = saltBytes.Concat(Encoding.UTF8.GetBytes(path)).ToArray();
        var hash = hmac.ComputeHash(dataToSign);

        var signature = Convert.ToBase64String(hash)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

        return $"{_settings.ImgproxyBaseUrl.TrimEnd('/')}/{signature}{path}";
    }

    public async Task Delete(string storageKey, CancellationToken ct = default)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _settings.BucketName,
            Key = storageKey
        };

        await _s3.DeleteObjectAsync(request, ct);
    }
}
