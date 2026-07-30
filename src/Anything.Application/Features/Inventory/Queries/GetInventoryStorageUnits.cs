using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitsQuery : IRequest<List<InventoryStorageUnitResponse>>;

public class GetInventoryStorageUnitsHandler(IRepository<InventoryStorageUnit> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryStorageUnitsQuery, List<InventoryStorageUnitResponse>>
{
    public async Task<List<InventoryStorageUnitResponse>> Handle(GetInventoryStorageUnitsQuery query, CancellationToken ct = default)
    {
        var storageUnits = await repository.Query()
            .Where(s => s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);
        return storageUnits.Select(InventoryMapping.ToResponse).ToList();
    }
}
