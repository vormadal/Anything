using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryStorageUnitByIdHandler(
    IRepository<InventoryStorageUnit> repository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryStorageUnitByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryStorageUnitByIdQuery query, CancellationToken ct = default)
    {
        var storageUnit = await repository.Query()
            .Where(s => s.Id == query.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (storageUnit is null)
            return Results.NotFound();

        // InventoryStorageUnitResponse is shared with the list endpoint, so the field has to mean
        // the same thing here rather than always coming back null.
        var thumbnails = await InventoryThumbnailLookup.Load(
            attachmentRepository,
            imageStorageService,
            InventoryAttachmentOwner.StorageUnit,
            [storageUnit.Id],
            ct);

        return Results.Ok(InventoryMapping.ToResponse(storageUnit, thumbnails.GetValueOrDefault(storageUnit.Id)));
    }
}
