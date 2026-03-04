using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryStorageUnitCommand(string Name, string? Type) : IRequest<InventoryStorageUnit>;

public class CreateInventoryStorageUnitHandler(IRepository<InventoryStorageUnit> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateInventoryStorageUnitCommand, InventoryStorageUnit>
{
    public async Task<InventoryStorageUnit> Handle(CreateInventoryStorageUnitCommand command, CancellationToken ct = default)
    {
        var storageUnit = new InventoryStorageUnit
        {
            Name = command.Name,
            Type = command.Type,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        repository.Add(storageUnit);
        await unitOfWork.SaveChanges(ct);
        return storageUnit;
    }
}
