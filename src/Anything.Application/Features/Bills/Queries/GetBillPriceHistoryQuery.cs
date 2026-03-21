using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillPriceHistoryQuery(int BillId) : IRequest<List<BillPriceHistoryResponse>>;

public class GetBillPriceHistoryHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository)
    : IRequestHandler<GetBillPriceHistoryQuery, List<BillPriceHistoryResponse>>
{
    public async Task<List<BillPriceHistoryResponse>> Handle(GetBillPriceHistoryQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.GetById(query.BillId);
        if (bill is null || bill.DeletedOn != null)
            return [];

        var entries = await priceHistoryRepository.Query()
            .Where(ph => ph.BillId == query.BillId)
            .OrderByDescending(ph => ph.EffectiveDate)
            .ToListAsync(ct);

        return entries
            .Select((entry, index) =>
            {
                var previous = index < entries.Count - 1 ? entries[index + 1] : null;
                return new BillPriceHistoryResponse(
                    entry.Id,
                    entry.BillId,
                    entry.Amount,
                    entry.EffectiveDate,
                    entry.Notes,
                    previous?.Amount,
                    entry.CreatedOn,
                    entry.ModifiedOn);
            })
            .ToList();
    }
}
