using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryItemCommand(int Id, string Name, string? Description, int? BoxId, int? StorageUnitId) : IRequest<IResult>;

public class UpdateInventoryItemHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryItemCommand command, CancellationToken ct = default)
    {
        var item = await itemRepository.Query()
            .Where(i => i.Id == command.Id && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (item is null)
            return Results.NotFound();

        if (command.BoxId.HasValue)
        {
            var box = await boxRepository.Query()
                .Where(b => b.Id == command.BoxId.Value && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (box is null)
                return Results.BadRequest("Invalid box ID.");
        }

        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.Query()
                .Where(s => s.Id == command.StorageUnitId.Value && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (storageUnit is null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        item.Name = command.Name;
        item.Description = command.Description;
        item.BoxId = command.BoxId;
        item.StorageUnitId = command.StorageUnitId;
        item.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
