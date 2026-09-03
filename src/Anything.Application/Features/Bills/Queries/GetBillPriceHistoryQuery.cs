using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillPriceHistoryQuery(int BillId) : IRequest<IResult>;

public class GetBillPriceHistoryHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetBillPriceHistoryQuery, IResult>
{
    public async Task<IResult> Handle(GetBillPriceHistoryQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.Query().AsNoTracking()
            .Where(b => b.Id == query.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound();

        var entries = await priceHistoryRepository.Query().AsNoTracking()
            .Where(ph => ph.BillId == query.BillId)
            .OrderByDescending(ph => ph.EffectiveDate)
            .ToListAsync(ct);

        var result = entries
            .Select((entry, index) =>
            {
                var previous = index < entries.Count - 1 ? entries[index + 1] : null;
                return new BillPriceHistoryResponse(
                    entry.Id,
                    entry.BillId,
                    entry.Amount,
                    entry.EffectiveDate,
                    entry.EndDate,
                    entry.Notes,
                    previous?.Amount,
                    entry.CreatedOn,
                    entry.ModifiedOn);
            })
            .ToList();

        return Results.Ok(result);
    }
}
