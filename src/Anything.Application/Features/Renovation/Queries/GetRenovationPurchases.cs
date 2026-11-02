using Anything.Contracts.Renovation;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationPurchasesQuery(int ProjectId) : IRequest<IResult>;

public class GetRenovationPurchasesHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext) : IRequestHandler<GetRenovationPurchasesQuery, IResult>
{
    public async Task<IResult> Handle(GetRenovationPurchasesQuery query, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var projectExists = await repos.Projects.Query().AsNoTracking()
            .AnyAsync(p => p.Id == query.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (!projectExists)
            return Results.NotFound();

        var purchases = await repos.Purchases.Query().AsNoTracking()
            .Where(p => p.ProjectId == query.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null)
            .OrderByDescending(p => p.PurchasedOn).ThenByDescending(p => p.Id)
            .ToListAsync(ct);

        var purchaseIds = purchases.Select(p => p.Id).ToList();
        var lines = await (
                from a in repos.Allocations.Query().AsNoTracking()
                join l in repos.Lines.Query().AsNoTracking() on a.LineId equals l.Id
                join r in repos.Rooms.Query().AsNoTracking() on l.RoomId equals r.Id
                where purchaseIds.Contains(a.PurchaseId) && l.HouseholdId == householdId
                orderby a.Id
                select new
                {
                    a.PurchaseId,
                    Line = new RenovationPurchaseLineResponse(
                        l.Id, r.Id, r.Name, l.Label, l.Description, l.Unit, a.Quantity, a.Amount, a.InventoryItemId)
                })
            .ToListAsync(ct);
        var byPurchase = lines.ToLookup(x => x.PurchaseId, x => x.Line);

        // One grouped count, so the list can show a paperclip without a call per purchase.
        var attachmentCounts = await repos.PurchaseAttachments.Query().AsNoTracking()
            .Where(a => purchaseIds.Contains(a.PurchaseId) && a.HouseholdId == householdId && a.DeletedOn == null)
            .GroupBy(a => a.PurchaseId)
            .Select(g => new { PurchaseId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var countByPurchase = attachmentCounts.ToDictionary(c => c.PurchaseId, c => c.Count);

        return Results.Ok(purchases
            .Select(p => new RenovationPurchaseResponse(
                p.Id, p.Vendor, p.VendorId, p.PurchasedOn, p.TotalAmount, p.Notes, byPurchase[p.Id].ToList(), p.CreatedOn,
                countByPurchase.GetValueOrDefault(p.Id)))
            .ToList());
    }
}
