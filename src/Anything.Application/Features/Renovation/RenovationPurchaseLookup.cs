using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation;

public static class RenovationPurchaseLookup
{
    /// <summary>
    /// Whether the purchase exists, belongs to the household and to <paramref name="projectId"/>, and hasn't been deleted.
    /// Every purchase-attachment handler checks this before touching an attachment.
    /// </summary>
    public static Task<bool> PurchaseExists(
        RenovationRepositories repos, int householdId, int projectId, int purchaseId, CancellationToken ct) =>
        repos.Purchases.Query().AsNoTracking()
            .AnyAsync(p => p.Id == purchaseId && p.ProjectId == projectId && p.HouseholdId == householdId && p.DeletedOn == null, ct);

    /// <summary>
    /// The subset of <paramref name="lineIds"/> that have at least one allocation on a purchase that
    /// hasn't been deleted, optionally ignoring one purchase (the one being deleted).
    /// </summary>
    public static async Task<HashSet<int>> LinesWithPurchases(
        RenovationRepositories repos, int householdId, List<int> lineIds, CancellationToken ct, int? ignorePurchaseId = null)
    {
        if (lineIds.Count == 0)
            return [];

        var ids = await (
                from a in repos.Allocations.Query().AsNoTracking()
                join p in repos.Purchases.Query().AsNoTracking() on a.PurchaseId equals p.Id
                where lineIds.Contains(a.LineId)
                      && p.HouseholdId == householdId
                      && p.DeletedOn == null
                      && (ignorePurchaseId == null || p.Id != ignorePurchaseId)
                select a.LineId)
            .Distinct()
            .ToListAsync(ct);
        return ids.ToHashSet();
    }
}
