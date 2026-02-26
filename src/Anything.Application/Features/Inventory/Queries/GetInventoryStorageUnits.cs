using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitsQuery : IRequest<List<InventoryStorageUnit>>;

public class GetInventoryStorageUnitsHandler(IRepository<InventoryStorageUnit> repository)
    : IRequestHandler<GetInventoryStorageUnitsQuery, List<InventoryStorageUnit>>
{
    public async Task<List<InventoryStorageUnit>> Handle(GetInventoryStorageUnitsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(s => s.DeletedOn == null)
            .ToListAsync(ct);
    }
}
