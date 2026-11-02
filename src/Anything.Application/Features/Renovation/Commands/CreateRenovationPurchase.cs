using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record CreateRenovationPurchaseCommand(int ProjectId, CreateRenovationPurchaseRequest Request) : IRequest<IResult>;

/// <summary>
/// Records one payment against one or more lines. Each line states the quantity bought (less than
/// what remains for a partial purchase); the total is split across the lines in proportion to
/// quantity × unit price — see <see cref="RenovationCalculator.Split"/>.
/// </summary>
public class CreateRenovationPurchaseHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateRenovationPurchaseCommand, IResult>
{
    public async Task<IResult> Handle(CreateRenovationPurchaseCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var request = command.Request;

        var projectExists = await repos.Projects.Query()
            .AnyAsync(p => p.Id == command.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (!projectExists)
            return Results.NotFound();

        if (request.Lines.Count == 0 || request.Lines.Any(l => l.Quantity <= 0))
            return Results.BadRequest("Every purchased line needs a quantity above zero.");

        var vendor = request.VendorId is null ? null : await FindVendor(request.VendorId.Value, householdId, ct);
        if (request.VendorId is not null && vendor is null)
            return Results.BadRequest("Invalid vendor ID.");

        var lineIds = request.Lines.Select(l => l.LineId).ToList();
        if (lineIds.Distinct().Count() != lineIds.Count)
            return Results.BadRequest("Each line can appear only once in a purchase.");

        var found = await (
                from l in repos.Lines.Query()
                join r in repos.Rooms.Query() on l.RoomId equals r.Id
                where lineIds.Contains(l.Id) && l.HouseholdId == householdId && l.DeletedOn == null
                      && r.ProjectId == command.ProjectId && r.HouseholdId == householdId && r.DeletedOn == null
                select new { Line = l, RoomName = r.Name })
            .ToListAsync(ct);
        if (found.Count != lineIds.Count)
            return Results.BadRequest("One or more lines don't belong to this project.");

        var byId = found.ToDictionary(f => f.Line.Id);
        var ordered = request.Lines.Select(l => (Request: l, byId[l.LineId].Line, byId[l.LineId].RoomName)).ToList();
        var amounts = RenovationCalculator.Split(
            request.TotalAmount,
            ordered.Select(o => o.Request.Quantity * o.Line.UnitPrice).ToList());

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var purchase = new RenovationPurchase
        {
            HouseholdId = householdId,
            ProjectId = command.ProjectId,
            Vendor = vendor?.Name ?? (string.IsNullOrWhiteSpace(request.Vendor) ? null : request.Vendor.Trim()),
            VendorId = vendor?.Id,
            PurchasedOn = request.PurchasedOn,
            TotalAmount = request.TotalAmount,
            Notes = request.Notes,
            CreatedOn = now
        };
        repos.Purchases.Add(purchase);
        await unitOfWork.SaveChanges(ct);

        var allocations = ordered.Select((o, i) => new RenovationPurchaseAllocation
        {
            PurchaseId = purchase.Id,
            LineId = o.Line.Id,
            Quantity = o.Request.Quantity,
            Amount = amounts[i]
        }).ToList();
        repos.Allocations.AddRange(allocations);
        foreach (var o in ordered.Where(o => o.Request.MarkComplete))
        {
            o.Line.IsComplete = true;
            o.Line.ModifiedOn = now;
        }
        await unitOfWork.SaveChanges(ct);

        var lines = ordered.Select((o, i) => new RenovationPurchaseLineResponse(
            o.Line.Id, o.Line.RoomId, o.RoomName, o.Line.Label, o.Line.Description, o.Line.Unit,
            o.Request.Quantity, amounts[i], null)).ToList();
        return Results.Created(
            $"/api/renovation-projects/{command.ProjectId}/purchases",
            new RenovationPurchaseResponse(purchase.Id, purchase.Vendor, purchase.VendorId, purchase.PurchasedOn,
                purchase.TotalAmount, purchase.Notes, lines, purchase.CreatedOn, AttachmentCount: 0));
    }

    // Scoped in the query: another household's vendor, or a deleted one, simply isn't found.
    private async Task<Vendor?> FindVendor(int vendorId, int householdId, CancellationToken ct) =>
        await repos.Vendors.Query()
            .FirstOrDefaultAsync(v => v.Id == vendorId && v.HouseholdId == householdId && v.DeletedOn == null, ct);
}
