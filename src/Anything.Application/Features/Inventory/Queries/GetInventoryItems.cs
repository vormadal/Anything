using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemsQuery : IRequest<List<InventoryItemSummaryResponse>>;

public class GetInventoryItemsHandler(IRepository<InventoryItem> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryItemsQuery, List<InventoryItemSummaryResponse>>
{
    public async Task<List<InventoryItemSummaryResponse>> Handle(GetInventoryItemsQuery query, CancellationToken ct = default)
    {
        var items = await repository.Query()
            .Where(i => i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);
        return items.Select(InventoryMapping.ToSummary).ToList();
    }
}
