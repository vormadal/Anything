using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxesQuery : IRequest<List<InventoryBoxResponse>>;

public class GetInventoryBoxesHandler(IRepository<InventoryBox> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryBoxesQuery, List<InventoryBoxResponse>>
{
    public async Task<List<InventoryBoxResponse>> Handle(GetInventoryBoxesQuery query, CancellationToken ct = default)
    {
        var boxes = await repository.Query()
            .Where(b => b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);
        return boxes.Select(InventoryMapping.ToResponse).ToList();
    }
}
