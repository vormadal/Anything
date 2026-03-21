namespace Anything.Core.Services;

public interface IImageStorageService
{
    Task Initialize(bool ensureBucketExists = false, CancellationToken ct = default);

    Task<string> Upload(Stream stream, string fileName, string contentType, long contentLength,
        CancellationToken ct = default, string folder = "files");

    string GetImageUrl(string storageKey, int width, int height, string resizingType = "fill");

    string GetFileUrl(string storageKey);

    Task Delete(string storageKey, CancellationToken ct = default);
}
