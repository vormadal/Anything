using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryStorageUnitCommand(int Id, string Name, string? Type) : IRequest<IResult>;

public class UpdateInventoryStorageUnitHandler(IRepository<InventoryStorageUnit> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateInventoryStorageUnitCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = await repository.GetById(command.Id);
        if (storageUnit is null || storageUnit.DeletedOn != null)
            return Results.NotFound();

        storageUnit.Name = command.Name;
        storageUnit.Type = command.Type;
        storageUnit.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
