using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryBoxCommand(int Number, int? StorageUnitId) : IRequest<IResult>;

public class CreateInventoryBoxHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateInventoryBoxCommand, IResult>
{
    public async Task<IResult> Handle(CreateInventoryBoxCommand command, CancellationToken ct = default)
    {
        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.Query()
                .Where(s => s.Id == command.StorageUnitId.Value && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (storageUnit is null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        var box = new InventoryBox
        {
            HouseholdId = householdContext.HouseholdId,
            Number = command.Number,
            StorageUnitId = command.StorageUnitId,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        boxRepository.Add(box);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/inventory-boxes/{box.Id}", box);
    }
}
