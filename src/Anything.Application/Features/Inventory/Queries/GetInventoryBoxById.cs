using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryBoxByIdHandler(IRepository<InventoryBox> repository)
    : IRequestHandler<GetInventoryBoxByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryBoxByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is InventoryBox box && box.DeletedOn == null
            ? Results.Ok(box)
            : Results.NotFound();
    }
}
