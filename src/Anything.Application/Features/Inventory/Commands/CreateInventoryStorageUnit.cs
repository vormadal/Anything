using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryStorageUnitCommand(string Name, string? Type) : IRequest<InventoryStorageUnitResponse>;

public class CreateInventoryStorageUnitHandler(IRepository<InventoryStorageUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateInventoryStorageUnitCommand, InventoryStorageUnitResponse>
{
    public async Task<InventoryStorageUnitResponse> Handle(CreateInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = new InventoryStorageUnit
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            Type = command.Type,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        repository.Add(storageUnit);
        await unitOfWork.SaveChanges(ct);
        return InventoryMapping.ToResponse(storageUnit);
    }
}
