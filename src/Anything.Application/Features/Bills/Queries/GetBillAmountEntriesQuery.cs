using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillAmountEntriesQuery(int BillId) : IRequest<IResult>;

public class GetBillAmountEntriesHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAmountEntry> amountEntryRepository,
    IHouseholdContext householdContext)
    : IRequestHandler<GetBillAmountEntriesQuery, IResult>
{
    public async Task<IResult> Handle(GetBillAmountEntriesQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.Query()
            .Where(b => b.Id == query.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound();

        var entries = await amountEntryRepository.Query()
            .Where(ae => ae.BillId == query.BillId)
            .OrderByDescending(ae => ae.PeriodDate)
            .ToListAsync(ct);

        var result = entries
            .Select(entry => new BillAmountEntryResponse(
                entry.Id,
                entry.BillId,
                entry.Amount,
                entry.PeriodDate,
                entry.Notes,
                entry.CreatedOn,
                entry.ModifiedOn))
            .ToList();

        return Results.Ok(result);
    }
}
