using Anything.Application.Features.Bills;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillSummaryQuery : IRequest<BillSummaryResponse>;

public class GetBillSummaryHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository)
    : IRequestHandler<GetBillSummaryQuery, BillSummaryResponse>
{
    public async Task<BillSummaryResponse> Handle(GetBillSummaryQuery query, CancellationToken ct = default)
    {
        var bills = await billRepository.Query()
            .Where(b => b.DeletedOn == null)
            .ToListAsync(ct);

        if (bills.Count == 0)
            return new BillSummaryResponse(0, 0m, 0, 0);

        var billIds = bills.Select(b => b.Id).ToList();

        var latestPrices = await priceHistoryRepository.Query()
            .Where(ph => billIds.Contains(ph.BillId))
            .GroupBy(ph => ph.BillId)
            .Select(g => new
            {
                BillId = g.Key,
                Amount = g.OrderByDescending(ph => ph.EffectiveDate).Select(ph => ph.Amount).First()
            })
            .ToListAsync(ct);

        var priceByBillId = latestPrices.ToDictionary(x => x.BillId, x => x.Amount);

        var totalMonthly = bills.Sum(b =>
        {
            var amount = priceByBillId.TryGetValue(b.Id, out var a) ? a : (decimal?)null;
            return BillHelpers.ComputeMonthlyEquivalent(b.Frequency, amount) ?? 0m;
        });

        return new BillSummaryResponse(
            bills.Count,
            Math.Round(totalMonthly, 2),
            bills.Count(b => b.IsAutomated),
            bills.Count(b => !b.IsAutomated));
    }
}
