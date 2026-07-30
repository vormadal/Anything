using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryBoxCommand(int Id, int Number, int? StorageUnitId, string? Label = null, string? Description = null) : IRequest<IResult>;

public class UpdateInventoryBoxHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateInventoryBoxCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryBoxCommand command, CancellationToken ct = default)
    {
        var box = await boxRepository.Query()
            .Where(b => b.Id == command.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (box is null)
            return Results.NotFound();

        if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.Query()
                .Where(s => s.Id == command.StorageUnitId.Value && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (storageUnit is null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        box.Number = command.Number;
        box.StorageUnitId = command.StorageUnitId;
        box.Label = command.Label;
        box.Description = command.Description;
        box.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
