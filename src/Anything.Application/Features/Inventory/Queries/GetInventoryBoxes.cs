using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxesQuery : IRequest<List<InventoryBox>>;

public class GetInventoryBoxesHandler(IRepository<InventoryBox> repository)
    : IRequestHandler<GetInventoryBoxesQuery, List<InventoryBox>>
{
    public async Task<List<InventoryBox>> Handle(GetInventoryBoxesQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(b => b.DeletedOn == null)
            .ToListAsync(ct);
    }
}
