using Anything.Core.Services;
using Microsoft.Extensions.Logging;

namespace Anything.Application.Services;

public class RecipeImageService(
    IHttpClientFactory httpClientFactory,
    IImageStorageService imageStorageService,
    ILogger<RecipeImageService> logger) : IRecipeImageService
{
    public async Task<string?> DownloadAndStoreAsync(string imageUrl, CancellationToken ct = default)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            using var response = await httpClient.GetAsync(imageUrl, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            var fileName = Path.GetFileName(new Uri(imageUrl).AbsolutePath);
            if (string.IsNullOrWhiteSpace(fileName))
                fileName = "recipe-image.jpg";

            await using var imageStream = await response.Content.ReadAsStreamAsync(ct);
            using var buffer = new MemoryStream();
            await imageStream.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            return await imageStorageService.Upload(buffer, fileName, contentType, buffer.Length, ct, folder: "recipes");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to download image from {ImageUrl}", imageUrl);
            return null;
        }
    }
}
