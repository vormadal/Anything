using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Services;

namespace Anything.Application.Features.Inventory;

/// <summary>Shared entity-to-contract projection for inventory attachments, used by the item/box/place variants.</summary>
public static class InventoryAttachmentMapping
{
    private const int ThumbnailSize = 300;
    private const string ThumbnailResizing = "fill";
    private const int FullWidth = 1920;
    private const int FullHeight = 1080;
    private const string FullResizing = "fit";

    public static InventoryAttachmentResponse ToResponse(
        InventoryAttachment attachment, IImageStorageService imageStorageService, string downloadUrl)
    {
        string url;
        string? thumbnailUrl;

        if (IsImage(attachment.ContentType))
        {
            thumbnailUrl = ThumbnailUrl(attachment.StorageKey, imageStorageService);
            url = imageStorageService.GetImageUrl(attachment.StorageKey, FullWidth, FullHeight, FullResizing);
        }
        else
        {
            url = downloadUrl;
            thumbnailUrl = null;
        }

        return new InventoryAttachmentResponse(
            attachment.Id,
            attachment.Name,
            attachment.ContentType,
            attachment.Kind,
            url,
            thumbnailUrl,
            attachment.SortOrder,
            attachment.CreatedOn);
    }

    /// <summary>The same thumbnail render the attachment list returns, reused by <see cref="InventoryThumbnailLookup"/>.</summary>
    internal static string ThumbnailUrl(string storageKey, IImageStorageService imageStorageService) =>
        imageStorageService.GetImageUrl(storageKey, ThumbnailSize, ThumbnailSize, ThumbnailResizing);

    internal static bool IsImage(string contentType) =>
        contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
}
