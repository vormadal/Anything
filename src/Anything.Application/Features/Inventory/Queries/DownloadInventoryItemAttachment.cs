using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record DownloadInventoryItemAttachmentQuery(int ItemId, int AttachmentId) : IRequest<IResult>;

public class DownloadInventoryItemAttachmentHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<DownloadInventoryItemAttachmentQuery, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DownloadInventoryItemAttachmentQuery query, CancellationToken ct = default)
    {
        var itemExists = await itemRepository.Query()
            .AnyAsync(i => i.Id == query.ItemId && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId, ct);
        if (!itemExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .Where(a => a.Id == query.AttachmentId && a.ItemId == query.ItemId && a.DeletedOn == null)
            .FirstOrDefaultAsync(ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        var stream = await imageStorageService.GetFileStream(attachment.StorageKey, ct);
        return Results.Stream(stream, attachment.ContentType, attachment.Name);
    }
}
