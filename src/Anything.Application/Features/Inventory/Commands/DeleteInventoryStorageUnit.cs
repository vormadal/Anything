using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryStorageUnitCommand(int Id) : IRequest<IResult>;

public class DeleteInventoryStorageUnitHandler(
    IRepository<InventoryStorageUnit> storageUnitRepo,
    IRepository<InventoryBox> boxRepo,
    IRepository<InventoryItem> itemRepo,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteInventoryStorageUnitCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = await storageUnitRepo.Query()
            .Where(s => s.Id == command.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (storageUnit is null)
            return Results.NotFound();

        var hasActiveBoxes = await boxRepo.Query()
            .AnyAsync(b => b.StorageUnitId == command.Id && b.DeletedOn == null, ct);
        var hasActiveItems = await itemRepo.Query()
            .AnyAsync(i => i.StorageUnitId == command.Id && i.DeletedOn == null, ct);
        var hasActiveChildren = await storageUnitRepo.Query()
            .AnyAsync(s => s.ParentId == command.Id && s.DeletedOn == null, ct);

        if (hasActiveBoxes || hasActiveItems || hasActiveChildren)
            return Results.Conflict("Cannot delete storage unit while active boxes, items, or child places are associated with it.");

        storageUnit.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
