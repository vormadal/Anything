using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryStorageUnitCommand(string Name, string? Type, int? ParentId) : IRequest<IResult>;

public class CreateInventoryStorageUnitHandler(IRepository<InventoryStorageUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateInventoryStorageUnitCommand, IResult>
{
    public async Task<IResult> Handle(CreateInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        if (command.ParentId.HasValue)
        {
            var parentExists = await repository.Query()
                .AnyAsync(s => s.Id == command.ParentId.Value && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId, ct);
            if (!parentExists)
                return Results.BadRequest("Invalid parent place ID.");
        }

        var storageUnit = new InventoryStorageUnit
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            Type = command.Type,
            ParentId = command.ParentId,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        repository.Add(storageUnit);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/inventory-storage-units/{storageUnit.Id}", InventoryMapping.ToResponse(storageUnit));
    }
}
