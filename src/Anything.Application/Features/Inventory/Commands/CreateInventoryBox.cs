using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryBoxCommand(int Number, int? StorageUnitId) : IRequest<IResult>;

public class CreateInventoryBoxHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<CreateInventoryBoxCommand, IResult>
{
    public async Task<IResult> Handle(CreateInventoryBoxCommand command, CancellationToken ct = default)
    {
        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.GetById(command.StorageUnitId.Value);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        var box = new InventoryBox
        {
            Number = command.Number,
            StorageUnitId = command.StorageUnitId
        };

        boxRepository.Add(box);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/inventory-boxes/{box.Id}", box);
    }
}
