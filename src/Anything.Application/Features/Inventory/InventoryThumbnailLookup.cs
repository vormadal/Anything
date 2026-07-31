using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory;

/// <summary>Which of <see cref="InventoryAttachment"/>'s three owner FKs to match on.</summary>
public enum InventoryAttachmentOwner
{
    Item,
    Box,
    StorageUnit
}

/// <summary>
/// Resolves the thumbnail of each owner's first photo, so list endpoints can return one per
/// row instead of the frontend making an attachments call per row.
/// </summary>
public static class InventoryThumbnailLookup
{
    /// <summary>
    /// Maps owner id to the thumbnail URL of that owner's first photo attachment. Owners with
    /// no photo are simply absent from the dictionary.
    /// </summary>
    /// <remarks>
    /// Deliberately does NOT re-check household ownership of the attachment rows — that is safe
    /// only because every caller derives <paramref name="ownerIds"/> from an already
    /// household-scoped query. A caller passing unscoped ids would leak cross-household URLs.
    /// </remarks>
    public static async Task<IReadOnlyDictionary<int, string>> Load(
        IRepository<InventoryAttachment> attachments,
        IImageStorageService imageStorageService,
        InventoryAttachmentOwner owner,
        IReadOnlyCollection<int> ownerIds,
        CancellationToken ct = default)
    {
        if (ownerIds.Count == 0)
            return new Dictionary<int, string>();

        // Nullable ids matched against a nullable FK: `ids.Contains(a.ItemId)` translates to a
        // plain `= ANY(@ids)`, where the `a.ItemId.Value` form leans on EF's nullable unwrapping
        // and can fail to translate at runtime.
        var ids = ownerIds.Select(id => (int?)id).ToList();

        var query = attachments.Query()
            .Where(a => a.DeletedOn == null && a.Kind == InventoryAttachmentKinds.Photo);

        query = owner switch
        {
            InventoryAttachmentOwner.Item => query.Where(a => ids.Contains(a.ItemId)),
            InventoryAttachmentOwner.Box => query.Where(a => ids.Contains(a.BoxId)),
            _ => query.Where(a => ids.Contains(a.StorageUnitId))
        };

        // Grouped in memory rather than in SQL: EF can't translate `GroupBy(...).First()`, and
        // GetImageUrl is a client-side call that can't live in an expression tree anyway. The row
        // count here is one household's photos.
        var photos = await query
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Id)
            .ToListAsync(ct);

        return photos
            .Where(a => InventoryAttachmentMapping.IsImage(a.ContentType))
            .GroupBy(a => OwnerId(a, owner))
            .ToDictionary(
                g => g.Key,
                g => InventoryAttachmentMapping.ThumbnailUrl(g.First().StorageKey, imageStorageService));
    }

    private static int OwnerId(InventoryAttachment attachment, InventoryAttachmentOwner owner) => owner switch
    {
        InventoryAttachmentOwner.Item => attachment.ItemId ?? 0,
        InventoryAttachmentOwner.Box => attachment.BoxId ?? 0,
        _ => attachment.StorageUnitId ?? 0
    };
}
