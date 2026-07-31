using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitsQuery : IRequest<List<InventoryStorageUnitResponse>>;

public class GetInventoryStorageUnitsHandler(
    IRepository<InventoryStorageUnit> repository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryStorageUnitsQuery, List<InventoryStorageUnitResponse>>
{
    public async Task<List<InventoryStorageUnitResponse>> Handle(GetInventoryStorageUnitsQuery query, CancellationToken ct = default)
    {
        var storageUnits = await repository.Query()
            .Where(s => s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);

        var thumbnails = await InventoryThumbnailLookup.Load(
            attachmentRepository,
            imageStorageService,
            InventoryAttachmentOwner.StorageUnit,
            storageUnits.Select(s => s.Id).ToList(),
            ct);

        return storageUnits
            .Select(s => InventoryMapping.ToResponse(s, thumbnails.GetValueOrDefault(s.Id)))
            .ToList();
    }
}
