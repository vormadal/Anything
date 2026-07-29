using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UpdateInventoryItemCommand(
    int Id,
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

public class UpdateInventoryItemHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(UpdateInventoryItemCommand command, CancellationToken ct = default)
    {
        var item = await itemRepository.Query()
            .Where(i => i.Id == command.Id && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (item is null)
            return Results.NotFound();

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

        item.Name = command.Name;
        item.Description = command.Description;
        item.BoxId = command.BoxId;
        item.StorageUnitId = storageUnitId;
        item.Quantity = command.Quantity;
        item.Brand = command.Brand;
        item.Model = command.Model;
        item.SerialNumber = command.SerialNumber;
        item.PurchasedOn = command.PurchasedOn;
        item.PurchasePrice = command.PurchasePrice;
        item.WarrantyExpiresOn = command.WarrantyExpiresOn;
        item.Notes = command.Notes;
        item.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
