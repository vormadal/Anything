using System.IO.Pipelines;
using System.Security.Cryptography;
using System.Text.Json;
using Anything.Application.Configuration;
using Anything.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Anything.Application.Services;

public class MinioStorageService : IImageStorageService
{
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

    public async Task Initialize(bool ensureBucketExists = false, CancellationToken ct = default)
    {
        if (ensureBucketExists)
        {
            var exists = await _client.BucketExistsAsync(new BucketExistsArgs().WithBucket(_settings.BucketName), ct);
            if (!exists)
            {
                await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(_settings.BucketName), ct);
                _logger.LogInformation("Created bucket {BucketName}", _settings.BucketName);
            }
        }

        if (_settings.UseS3Source)
        {
            // Private bucket: revoke any anonymous-read policy a previous
            // deployment (or the legacy code path below) may have set. imgproxy
            // reads via S3 credentials instead; attachments stream through the API.
            await RemovePublicPolicy(ct);
            return;
        }

        var policy = JsonSerializer.Serialize(new
        {
            Version = "2012-10-17",
            Statement = new[]
            {
                new
                {
                    Effect = "Allow",
                    Principal = new { AWS = new[] { "*" } },
                    Action = new[] { "s3:GetObject" },
                    Resource = new[] { $"arn:aws:s3:::{_settings.BucketName}/*" }
                }
            }
        });

        _logger.LogDebug("Setting bucket policy for {BucketName}: {Policy}", _settings.BucketName, policy);

        try
        {
            await _client.SetPolicyAsync(new SetPolicyArgs()
                .WithBucket(_settings.BucketName)
                .WithPolicy(policy));
            _logger.LogInformation("Bucket policy set successfully for {BucketName}", _settings.BucketName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set bucket policy for {BucketName}. The bucket may not exist yet or credentials may be incorrect.", _settings.BucketName);
        }
    }

    private async Task RemovePublicPolicy(CancellationToken ct)
    {
        try
        {
            await _client.RemovePolicyAsync(new RemovePolicyArgs().WithBucket(_settings.BucketName), ct);
            _logger.LogInformation("Removed anonymous-read bucket policy for {BucketName}", _settings.BucketName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to remove bucket policy for {BucketName}. The bucket may not exist yet or may have no policy.", _settings.BucketName);
        }
    }

    public async Task<string> Upload(Stream stream, string fileName, string contentType,
        long contentLength, CancellationToken ct = default, string folder = "files")
    {
        var extension = Path.GetExtension(fileName);
        var objectKey = $"{folder}/{Guid.NewGuid()}{extension}";

        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(objectKey)
            .WithStreamData(stream)
            .WithObjectSize(contentLength)
            .WithContentType(contentType), ct);

        return objectKey;
    }

    // Bounds how far the MinIO download can run ahead of the client actually
    // reading — the writer side awaits pipe.Writer.FlushAsync() and blocks once
    // this many unread bytes are buffered, giving real backpressure instead of
    // materializing the whole object before the first byte reaches the client.
    private const int StreamBufferBytes = 64 * 1024;

    public Task<Stream> GetFileStream(string storageKey, CancellationToken ct = default)
    {
        // Minio's GetObjectAsync is callback-based (it pushes bytes into a
        // stream you supply) rather than returning a readable Stream, so a
        // Pipe bridges that push model to the pull-based Stream Results.Stream
        // needs — the download runs in the background and the reader can start
        // consuming bytes as soon as the first chunk arrives, instead of
        // waiting for (and buffering) the entire object first.
        var pipe = new Pipe(new PipeOptions(
            pauseWriterThreshold: StreamBufferBytes,
            resumeWriterThreshold: StreamBufferBytes / 2));

        _ = DownloadInto(storageKey, pipe.Writer, ct);

        return Task.FromResult(pipe.Reader.AsStream());
    }

    private async Task DownloadInto(string storageKey, PipeWriter writer, CancellationToken ct)
    {
        try
        {
            await _client.GetObjectAsync(new GetObjectArgs()
                .WithBucket(_settings.BucketName)
                .WithObject(storageKey)
                .WithCallbackStream(async (stream, token) => await stream.CopyToAsync(writer.AsStream(), token)), ct);
            await writer.CompleteAsync();
        }
        catch (Exception ex)
        {
            // Surfaces on the reader side (Results.Stream copying to the HTTP
            // response) instead of being lost by this background download task.
            await writer.CompleteAsync(ex);
        }
    }

    public string GetImageUrl(string storageKey, int width, int height, string resizingType = "fill")
    {
        var sourceUrl = _settings.UseS3Source
            ? $"s3://{_settings.BucketName}/{storageKey}"
            : $"{_settings.MinioSourceEndpoint}/{_settings.BucketName}/{storageKey}";
        var resize = resizingType == "fill" ? "fill" : "fit";
        var path = $"/rs:{resize}:{width}:{height}/f:webp/plain/{sourceUrl}";

        var signaturePrefix = string.IsNullOrEmpty(_settings.ImageProxyKey) || string.IsNullOrEmpty(_settings.ImageProxySalt)
            ? "/insecure"
            : "/" + SignPath(path, _settings.ImageProxyKey, _settings.ImageProxySalt);

        return $"{_settings.ImageProxyBaseUrl.TrimEnd('/')}{signaturePrefix}{path}";
    }

    private static string SignPath(string path, string hexKey, string hexSalt)
    {
        var key = Convert.FromHexString(hexKey);
        var salt = Convert.FromHexString(hexSalt);
        var pathBytes = System.Text.Encoding.UTF8.GetBytes(path);

        var data = new byte[salt.Length + pathBytes.Length];
        salt.CopyTo(data, 0);
        pathBytes.CopyTo(data, salt.Length);

        var hash = HMACSHA256.HashData(key, data);
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public async Task Delete(string storageKey, CancellationToken ct = default)
    {
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(storageKey), ct);
    }
}
