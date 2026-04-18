using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryItemByIdHandler(IRepository<InventoryItem> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryItemByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryItemByIdQuery query, CancellationToken ct = default)
    {
        var item = await repository.Query()
            .Where(i => i.Id == query.Id && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return item is not null ? Results.Ok(item) : Results.NotFound();
    }
}
