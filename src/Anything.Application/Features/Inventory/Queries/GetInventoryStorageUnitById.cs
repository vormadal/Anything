using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryStorageUnitByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryStorageUnitByIdHandler(IRepository<InventoryStorageUnit> repository)
    : IRequestHandler<GetInventoryStorageUnitByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryStorageUnitByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is InventoryStorageUnit storageUnit && storageUnit.DeletedOn == null
            ? Results.Ok(storageUnit)
            : Results.NotFound();
    }
}
