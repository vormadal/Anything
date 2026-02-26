using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryItemByIdHandler(IRepository<InventoryItem> repository)
    : IRequestHandler<GetInventoryItemByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryItemByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is InventoryItem item && item.DeletedOn == null
            ? Results.Ok(item)
            : Results.NotFound();
    }
}
