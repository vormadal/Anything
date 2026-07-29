using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record CreateInventoryItemCommand(
    string Name,
    string? Description,
    int? BoxId,
    int? StorageUnitId,
    int? Quantity = null,
    string? Brand = null,
    string? Model = null,
    string? SerialNumber = null,
    DateTime? PurchasedOn = null,
    decimal? PurchasePrice = null,
    DateTime? WarrantyExpiresOn = null,
    string? Notes = null) : IRequest<IResult>;

public class CreateInventoryItemHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(CreateInventoryItemCommand command, CancellationToken ct = default)
    {
        // A box's own place always wins over whatever place the caller sent,
        // so an item can never end up claiming a box while disagreeing about
        // which place that box is in.
        int? storageUnitId = command.StorageUnitId;

        if (command.BoxId.HasValue)
        {
            var box = await boxRepository.Query()
                .Where(b => b.Id == command.BoxId.Value && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (box is null)
                return Results.BadRequest("Invalid box ID.");
            storageUnitId = box.StorageUnitId;
        }
        else if (command.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnitRepository.Query()
                .Where(s => s.Id == command.StorageUnitId.Value && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (storageUnit is null)
                return Results.BadRequest("Invalid storage unit ID.");
        }

        var item = new InventoryItem
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            Description = command.Description,
            BoxId = command.BoxId,
            StorageUnitId = storageUnitId,
            Quantity = command.Quantity,
            Brand = command.Brand,
            Model = command.Model,
            SerialNumber = command.SerialNumber,
            PurchasedOn = command.PurchasedOn,
            PurchasePrice = command.PurchasePrice,
            WarrantyExpiresOn = command.WarrantyExpiresOn,
            Notes = command.Notes,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        itemRepository.Add(item);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/inventory-items/{item.Id}", InventoryMapping.ToResponse(item, []));
    }
}
