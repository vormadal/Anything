using Anything.Application.Features.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillByIdQuery(int Id) : IRequest<IResult>;

public class GetBillByIdHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IRepository<Location> locationRepository,
    IRepository<Vendor> vendorRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetBillByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetBillByIdQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.Query()
            .Where(b => b.Id == query.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound();

        var priceHistories = await priceHistoryRepository.Query()
            .Where(ph => ph.BillId == bill.Id)
            .ToListAsync(ct);

        var priceHistoriesByBillId = priceHistories.ToLookup(ph => ph.BillId);

        var locationsById = bill.LocationId.HasValue
            ? await locationRepository.Query()
                .Where(l => l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId && l.Id == bill.LocationId.Value)
                .ToDictionaryAsync(l => l.Id, ct)
            : [];

        var vendorsById = bill.VendorId.HasValue
            ? await vendorRepository.Query()
                .Where(v => v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId && v.Id == bill.VendorId.Value)
                .ToDictionaryAsync(v => v.Id, ct)
            : [];

        return Results.Ok(BillHelpers.ToBillResponse(bill, priceHistoriesByBillId, locationsById, vendorsById));
    }
}
