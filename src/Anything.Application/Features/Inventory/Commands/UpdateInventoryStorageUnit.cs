using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryStorageUnitCommand(int Id, string Name, string? Type) : IRequest<IResult>;

public class UpdateInventoryStorageUnitHandler(IRepository<InventoryStorageUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateInventoryStorageUnitCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = await repository.Query()
            .Where(s => s.Id == command.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (storageUnit is null)
            return Results.NotFound();

        storageUnit.Name = command.Name;
        storageUnit.Type = command.Type;
        storageUnit.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
