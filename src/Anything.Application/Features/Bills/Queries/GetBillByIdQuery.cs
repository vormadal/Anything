using Anything.Application.Features.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillByIdQuery(int Id) : IRequest<IResult>;

public class GetBillByIdHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IRepository<Location> locationRepository,
    IRepository<Vendor> vendorRepository)
    : IRequestHandler<GetBillByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetBillByIdQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.GetById(query.Id);
        if (bill is null || bill.DeletedOn != null)
            return Results.NotFound();

        var priceHistories = await priceHistoryRepository.Query()
            .Where(ph => ph.BillId == bill.Id)
            .ToListAsync(ct);

        var locations = await locationRepository.Query()
            .Where(l => l.DeletedOn == null)
            .ToListAsync(ct);

        var vendors = await vendorRepository.Query()
            .Where(v => v.DeletedOn == null)
            .ToListAsync(ct);

        return Results.Ok(BillHelpers.ToBillResponse(bill, priceHistories, locations, vendors));
    }
}
