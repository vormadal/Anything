using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Services;

namespace Anything.Application.Features.Inventory;

/// <summary>Shared entity-to-contract projection for inventory attachments, used by the item/box/place variants.</summary>
public static class InventoryAttachmentMapping
{
    public static InventoryAttachmentResponse ToResponse(
        InventoryAttachment attachment, IImageStorageService imageStorageService, string downloadUrl)
    {
        string url;
        string? thumbnailUrl;

        if (IsImage(attachment.ContentType))
        {
            thumbnailUrl = imageStorageService.GetImageUrl(attachment.StorageKey, 300, 300, "fill");
            url = imageStorageService.GetImageUrl(attachment.StorageKey, 1920, 1080, "fit");
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

    private static bool IsImage(string contentType) =>
        contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
}
