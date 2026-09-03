using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitAttachmentsQuery(int StorageUnitId) : IRequest<IResult>;

public class GetInventoryStorageUnitAttachmentsHandler(
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<GetInventoryStorageUnitAttachmentsQuery, IResult>
{
    private const string StorageUnitNotFound = "Storage unit not found.";

    public async Task<IResult> Handle(GetInventoryStorageUnitAttachmentsQuery query, CancellationToken ct = default)
    {
        var storageUnitExists = await storageUnitRepository.Query().AsNoTracking()
            .AnyAsync(s => s.Id == query.StorageUnitId && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId, ct);
        if (!storageUnitExists)
            return Results.NotFound(StorageUnitNotFound);

        var attachments = await attachmentRepository.Query().AsNoTracking()
            .Where(a => a.StorageUnitId == query.StorageUnitId && a.DeletedOn == null)
            .OrderBy(a => a.SortOrder)
            .ToListAsync(ct);

        var response = attachments.Select(a => InventoryAttachmentMapping.ToResponse(
            a, imageStorageService, $"/api/inventory-storage-units/{query.StorageUnitId}/attachments/{a.Id}/download"));

        return Results.Ok(response);
    }
}
