using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemsQuery : IRequest<List<InventoryItem>>;

public class GetInventoryItemsHandler(IRepository<InventoryItem> repository)
    : IRequestHandler<GetInventoryItemsQuery, List<InventoryItem>>
{
    public async Task<List<InventoryItem>> Handle(GetInventoryItemsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(i => i.DeletedOn == null)
            .ToListAsync(ct);
    }
}
