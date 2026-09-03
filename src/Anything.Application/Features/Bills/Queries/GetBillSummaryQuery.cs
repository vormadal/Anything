using Anything.Application.Features.Bills;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillSummaryQuery : IRequest<BillSummaryResponse>;

public class GetBillSummaryHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetBillSummaryQuery, BillSummaryResponse>
{
    public async Task<BillSummaryResponse> Handle(GetBillSummaryQuery query, CancellationToken ct = default)
    {
        var bills = await billRepository.Query().AsNoTracking()
            .Where(b => b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);

        if (bills.Count == 0)
            return new BillSummaryResponse(0, 0m, 0, 0, 0m, 0m);

        var billIds = bills.Select(b => b.Id).ToList();

        var allPriceEntries = await priceHistoryRepository.Query().AsNoTracking()
            .Where(ph => billIds.Contains(ph.BillId))
            .ToListAsync(ct);

        var latestPrices = allPriceEntries
            .GroupBy(ph => ph.BillId)
            .Select(g => new
            {
                BillId = g.Key,
                Amount = g.OrderByDescending(ph => ph.EffectiveDate).First().Amount
            })
            .ToList();

        var priceByBillId = latestPrices.ToDictionary(x => x.BillId, x => x.Amount);

        var totalMonthly = bills.Sum(b =>
        {
            var amount = priceByBillId.TryGetValue(b.Id, out var a) ? a : (decimal?)null;
            return BillHelpers.ComputeMonthlyEquivalent(b.Frequency, amount) ?? 0m;
        });

        var now = DateTime.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var currentMonthEntries = allPriceEntries
            .Where(ph => ph.EffectiveDate.Month == currentMonth && ph.EffectiveDate.Year == currentYear)
            .Sum(ph => ph.Amount);

        var currentYearEntries = allPriceEntries
            .Where(ph => ph.EffectiveDate.Year == currentYear)
            .Sum(ph => ph.Amount);

        return new BillSummaryResponse(
            bills.Count,
            Math.Round(totalMonthly, 2),
            bills.Count(b => b.IsAutomated),
            bills.Count(b => !b.IsAutomated),
            Math.Round(currentMonthEntries, 2),
            Math.Round(currentYearEntries, 2));
    }
}
