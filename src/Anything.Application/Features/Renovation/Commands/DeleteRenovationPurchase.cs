using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationPurchaseCommand(int ProjectId, int PurchaseId) : IRequest<IResult>;

/// <summary>
/// Soft-deletes a purchase; its allocations stop counting because every reader filters on the
/// purchase. A line marked done that has no other purchase left goes back to not done.
/// </summary>
public class DeleteRenovationPurchaseHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationPurchaseCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationPurchaseCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var purchase = await repos.Purchases.Query()
            .FirstOrDefaultAsync(p => p.Id == command.PurchaseId && p.ProjectId == command.ProjectId
                                      && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (purchase is null)
            return Results.NotFound();

        var now = timeProvider.GetUtcNow().UtcDateTime;
        purchase.DeletedOn = now;

        var lineIds = await repos.Allocations.Query()
            .Where(a => a.PurchaseId == purchase.Id)
            .Select(a => a.LineId)
            .Distinct()
            .ToListAsync(ct);
        var stillPurchased = await RenovationPurchaseLookup.LinesWithPurchases(
            repos, householdId, lineIds, ct, ignorePurchaseId: purchase.Id);
        var toReopen = lineIds.Where(id => !stillPurchased.Contains(id)).ToList();
        var lines = await repos.Lines.Query()
            .Where(l => toReopen.Contains(l.Id) && l.HouseholdId == householdId && l.IsComplete)
            .ToListAsync(ct);
        foreach (var line in lines)
        {
            line.IsComplete = false;
            line.ModifiedOn = now;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
