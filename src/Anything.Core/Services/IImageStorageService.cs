namespace Anything.Core.Services;

public interface IImageStorageService
{
    Task Initialize(CancellationToken ct = default);

    Task<string> Upload(Stream stream, string fileName, string contentType, long contentLength,
        CancellationToken ct = default);

    string GetImageUrl(string storageKey, int width, int height, string resizingType = "fill");

    Task Delete(string storageKey, CancellationToken ct = default);
}
