using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryBoxCommand(int Id, int Number, int? StorageUnitId) : IRequest<IResult>;

public class UpdateInventoryBoxHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<UpdateInventoryBoxCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryBoxCommand command, CancellationToken ct = default)
    {
        var box = await boxRepository.GetById(command.Id);
        if (box is null || box.DeletedOn != null)
            return Results.NotFound();

        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.GetById(command.StorageUnitId.Value);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        box.Number = command.Number;
        box.StorageUnitId = command.StorageUnitId;
        box.ModifiedOn = DateTime.UtcNow;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
