using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryItemCommand(int Id, string Name, string? Description, int? BoxId, int? StorageUnitId) : IRequest<IResult>;

public class UpdateInventoryItemHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryItemCommand command, CancellationToken ct = default)
    {
        var item = await itemRepository.GetById(command.Id);
        if (item is null || item.DeletedOn != null)
            return Results.NotFound();

        if (command.BoxId.HasValue)
        {
            var box = await boxRepository.GetById(command.BoxId.Value);
            if (box is null || box.DeletedOn != null)
                return Results.BadRequest("Invalid box ID.");
        }

        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.GetById(command.StorageUnitId.Value);
            if (storageUnit is null || storageUnit.DeletedOn != null)
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
