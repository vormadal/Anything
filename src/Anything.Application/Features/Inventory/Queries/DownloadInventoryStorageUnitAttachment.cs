using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record DownloadInventoryStorageUnitAttachmentQuery(int StorageUnitId, int AttachmentId) : IRequest<IResult>;

public class DownloadInventoryStorageUnitAttachmentHandler(
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<DownloadInventoryStorageUnitAttachmentQuery, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DownloadInventoryStorageUnitAttachmentQuery query, CancellationToken ct = default)
    {
        var storageUnitExists = await storageUnitRepository.Query()
            .AnyAsync(s => s.Id == query.StorageUnitId && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId, ct);
        if (!storageUnitExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .Where(a => a.Id == query.AttachmentId && a.StorageUnitId == query.StorageUnitId && a.DeletedOn == null)
            .FirstOrDefaultAsync(ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        var stream = await imageStorageService.GetFileStream(attachment.StorageKey, ct);
        return Results.Stream(stream, attachment.ContentType, attachment.Name);
    }
}
