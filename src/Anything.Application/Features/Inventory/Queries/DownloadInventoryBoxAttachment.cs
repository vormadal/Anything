using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record DownloadInventoryBoxAttachmentQuery(int BoxId, int AttachmentId) : IRequest<IResult>;

public class DownloadInventoryBoxAttachmentHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<DownloadInventoryBoxAttachmentQuery, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DownloadInventoryBoxAttachmentQuery query, CancellationToken ct = default)
    {
        var boxExists = await boxRepository.Query()
            .AnyAsync(b => b.Id == query.BoxId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!boxExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .Where(a => a.Id == query.AttachmentId && a.BoxId == query.BoxId && a.DeletedOn == null)
            .FirstOrDefaultAsync(ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        var stream = await imageStorageService.GetFileStream(attachment.StorageKey, ct);
        return Results.Stream(stream, attachment.ContentType, attachment.Name);
    }
}
