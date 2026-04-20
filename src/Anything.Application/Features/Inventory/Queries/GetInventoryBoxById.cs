using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryBoxByIdHandler(IRepository<InventoryBox> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryBoxByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryBoxByIdQuery query, CancellationToken ct = default)
    {
        var box = await repository.Query()
            .Where(b => b.Id == query.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return box is not null ? Results.Ok(box) : Results.NotFound();
    }
}
