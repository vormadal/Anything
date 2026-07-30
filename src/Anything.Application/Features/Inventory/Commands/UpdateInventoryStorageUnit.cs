using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryStorageUnitCommand(int Id, string Name, string? Type, int? ParentId) : IRequest<IResult>;

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

        if (command.ParentId.HasValue)
        {
            var validationError = await ValidateParent(command.Id, command.ParentId.Value, ct);
            if (validationError is not null)
                return validationError;
        }

        storageUnit.Name = command.Name;
        storageUnit.Type = command.Type;
        storageUnit.ParentId = command.ParentId;
        storageUnit.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }

    private async Task<IResult?> ValidateParent(int placeId, int parentId, CancellationToken ct)
    {
        if (parentId == placeId)
            return Results.BadRequest("A place cannot be its own parent.");

        var parentById = await repository.Query()
            .Where(s => s.HouseholdId == householdContext.HouseholdId && s.DeletedOn == null)
            .Select(s => new { s.Id, s.ParentId })
            .ToDictionaryAsync(s => s.Id, s => s.ParentId, ct);

        if (!parentById.ContainsKey(parentId))
            return Results.BadRequest("Invalid parent place ID.");

        var current = parentId;
        var visited = new HashSet<int>();
        while (visited.Add(current))
        {
            if (current == placeId)
                return Results.BadRequest("A place cannot be nested under its own descendant.");
            if (!parentById.TryGetValue(current, out var next) || next is null)
                break;
            current = next.Value;
        }

        return null;
    }
}
