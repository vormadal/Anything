namespace Anything.Application.Services;

public interface IRecipeImageService
{
    Task<string?> DownloadAndStoreAsync(string imageUrl, CancellationToken ct = default);
}
