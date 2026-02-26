using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryStorageUnitCommand(int Id) : IRequest<IResult>;

public class DeleteInventoryStorageUnitHandler(
    IRepository<InventoryStorageUnit> storageUnitRepo,
    IRepository<InventoryBox> boxRepo,
    IRepository<InventoryItem> itemRepo,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteInventoryStorageUnitCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = await storageUnitRepo.GetById(command.Id);
        if (storageUnit is null || storageUnit.DeletedOn != null)
            return Results.NotFound();

        var hasActiveBoxes = await boxRepo.Query()
            .AnyAsync(b => b.StorageUnitId == command.Id && b.DeletedOn == null, ct);
        var hasActiveItems = await itemRepo.Query()
            .AnyAsync(i => i.StorageUnitId == command.Id && i.DeletedOn == null, ct);

        if (hasActiveBoxes || hasActiveItems)
            return Results.Conflict("Cannot delete storage unit while active boxes or items are associated with it.");

        storageUnit.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
