using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryItemCommand(string Name, string? Description, int? BoxId, int? StorageUnitId) : IRequest<IResult>;

public class CreateInventoryItemHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<CreateInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(CreateInventoryItemCommand command, CancellationToken ct = default)
    {
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

        var item = new InventoryItem
        {
            Name = command.Name,
            Description = command.Description,
            BoxId = command.BoxId,
            StorageUnitId = command.StorageUnitId
        };

        itemRepository.Add(item);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/inventory-items/{item.Id}", item);
    }
}
