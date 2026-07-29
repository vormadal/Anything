using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryStorageUnitByIdHandler(IRepository<InventoryStorageUnit> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryStorageUnitByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryStorageUnitByIdQuery query, CancellationToken ct = default)
    {
        var storageUnit = await repository.Query()
            .Where(s => s.Id == query.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return storageUnit is not null ? Results.Ok(InventoryMapping.ToResponse(storageUnit)) : Results.NotFound();
    }
}
