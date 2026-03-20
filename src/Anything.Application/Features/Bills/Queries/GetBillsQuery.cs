using Anything.Application.Features.Bills;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillsQuery : IRequest<List<BillResponse>>;

public class GetBillsHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IRepository<Location> locationRepository,
    IRepository<Vendor> vendorRepository)
    : IRequestHandler<GetBillsQuery, List<BillResponse>>
{
    public async Task<List<BillResponse>> Handle(GetBillsQuery query, CancellationToken ct = default)
    {
        var bills = await billRepository.Query()
            .Where(b => b.DeletedOn == null)
            .OrderBy(b => b.Name)
            .ToListAsync(ct);

        if (bills.Count == 0)
            return [];

        var billIds = bills.Select(b => b.Id).ToList();

        var priceHistories = await priceHistoryRepository.Query()
            .Where(ph => billIds.Contains(ph.BillId))
            .ToListAsync(ct);

        var locations = await locationRepository.Query()
            .Where(l => l.DeletedOn == null)
            .ToListAsync(ct);

        var vendors = await vendorRepository.Query()
            .Where(v => v.DeletedOn == null)
            .ToListAsync(ct);

        return bills
            .Select(b => BillHelpers.ToBillResponse(b, priceHistories, locations, vendors))
            .ToList();
    }
}
