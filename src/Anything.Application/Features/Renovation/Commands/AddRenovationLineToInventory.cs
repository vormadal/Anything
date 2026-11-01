using Anything.Application.Features.Inventory;
using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record AddRenovationLineToInventoryCommand(
    int ProjectId,
    int PurchaseId,
    int LineId,
    AddRenovationLineToInventoryRequest Request) : IRequest<IResult>;

/// <summary>
/// Turns one purchased line into one inventory item. The allocation records the item it created, so a
/// second call is a 409 rather than a duplicate. Pieces and sets become <c>Quantity</c>; area and length
/// materials can't be counted, so their bought amount goes into the description instead.
/// </summary>
public class AddRenovationLineToInventoryHandler(
    RenovationRepositories repos,
    IRepository<InventoryItem> items,
    IRepository<InventoryBox> boxes,
    IRepository<InventoryStorageUnit> storageUnits,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRenovationLineToInventoryCommand, IResult>
{
    private const int NotesMaxLength = 1000;
    private const string CountableUnitPcs = "pcs";
    private const string CountableUnitSet = "set";

    public async Task<IResult> Handle(AddRenovationLineToInventoryCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var row = await (
                from a in repos.Allocations.Query()
                join p in repos.Purchases.Query() on a.PurchaseId equals p.Id
                join l in repos.Lines.Query() on a.LineId equals l.Id
                join r in repos.Rooms.Query() on l.RoomId equals r.Id
                where a.PurchaseId == command.PurchaseId && a.LineId == command.LineId
                      && p.ProjectId == command.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null
                      && l.HouseholdId == householdId
                      && r.HouseholdId == householdId
                select new { Allocation = a, Line = l, RoomName = r.Name, PurchasedOn = p.PurchasedOn })
            .FirstOrDefaultAsync(ct);
        if (row is null)
            return Results.NotFound();
        if (row.Allocation.InventoryItemId is not null)
            return Results.Conflict("This line is already in inventory.");

        var (storageUnitId, error) = await ResolvePlace(command.Request, householdId, ct);
        if (error is not null)
            return Results.BadRequest(error);

        var allocation = row.Allocation;
        var line = row.Line;
        var countable = line.Unit is CountableUnitPcs or CountableUnitSet;
        var item = new InventoryItem
        {
            HouseholdId = householdId,
            Name = line.Description,
            Description = countable ? null : $"{allocation.Quantity:0.##} {line.Unit}",
            BoxId = command.Request.BoxId,
            StorageUnitId = storageUnitId,
            Quantity = countable ? (int)Math.Round(allocation.Quantity, MidpointRounding.AwayFromZero) : null,
            Brand = command.Request.Brand,
            Model = command.Request.Model,
            PurchasedOn = row.PurchasedOn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            PurchasePrice = allocation.Amount,
            WarrantyExpiresOn = command.Request.WarrantyExpiresOn,
            Notes = Truncate($"Renovation: {row.RoomName} · {line.Label}", NotesMaxLength),
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        // The item's id only exists after the first save, so the allocation link is a second write.
        items.Add(item);
        await unitOfWork.SaveChanges(ct);
        allocation.InventoryItemId = item.Id;
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/inventory-items/{item.Id}", InventoryMapping.ToResponse(item, []));
    }

    // Mirrors CreateInventoryItemHandler: a box's own place always wins over the caller's place.
    private async Task<(int? StorageUnitId, string? Error)> ResolvePlace(
        AddRenovationLineToInventoryRequest request, int householdId, CancellationToken ct)
    {
        if (request.BoxId.HasValue)
        {
            var box = await boxes.Query()
                .FirstOrDefaultAsync(b => b.Id == request.BoxId.Value && b.DeletedOn == null && b.HouseholdId == householdId, ct);
            if (box is null)
                return (null, "Invalid box ID.");
            return (box.StorageUnitId, null);
        }

        if (request.StorageUnitId.HasValue)
        {
            var storageUnit = await storageUnits.Query()
                .FirstOrDefaultAsync(s => s.Id == request.StorageUnitId.Value && s.DeletedOn == null && s.HouseholdId == householdId, ct);
            if (storageUnit is null)
                return (null, "Invalid storage unit ID.");
        }

        return (request.StorageUnitId, null);
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
