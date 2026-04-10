using Anything.Application.Features.Bills;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillsQuery : IRequest<List<BillResponse>>;

public class GetBillsHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IRepository<Location> locationRepository,
    IRepository<Vendor> vendorRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetBillsQuery, List<BillResponse>>
{
    public async Task<List<BillResponse>> Handle(GetBillsQuery query, CancellationToken ct = default)
    {
        var bills = await billRepository.Query()
            .Where(b => b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .OrderBy(b => b.Name)
            .ToListAsync(ct);

        if (bills.Count == 0)
            return [];

        var billIds = bills.Select(b => b.Id).ToList();

        var priceHistories = await priceHistoryRepository.Query()
            .Where(ph => billIds.Contains(ph.BillId))
            .ToListAsync(ct);

        var locationIds = bills.Where(b => b.LocationId.HasValue).Select(b => b.LocationId!.Value).Distinct().ToList();
        var vendorIds = bills.Where(b => b.VendorId.HasValue).Select(b => b.VendorId!.Value).Distinct().ToList();

        var locations = locationIds.Count > 0
            ? await locationRepository.Query()
                .Where(l => l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId && locationIds.Contains(l.Id))
                .ToListAsync(ct)
            : [];

        var vendors = vendorIds.Count > 0
            ? await vendorRepository.Query()
                .Where(v => v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId && vendorIds.Contains(v.Id))
                .ToListAsync(ct)
            : [];

        var priceHistoriesByBillId = priceHistories.ToLookup(ph => ph.BillId);
        var locationsById = locations.ToDictionary(l => l.Id);
        var vendorsById = vendors.ToDictionary(v => v.Id);

        return bills
            .Select(b => BillHelpers.ToBillResponse(b, priceHistoriesByBillId, locationsById, vendorsById))
            .ToList();
    }
}
