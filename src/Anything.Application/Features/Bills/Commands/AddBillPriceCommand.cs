using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record AddBillPriceCommand(
    int BillId,
    decimal Amount,
    DateTime EffectiveDate,
    DateTime? EndDate,
    string? Notes) : IRequest<IResult>;

public class AddBillPriceHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<AddBillPriceCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";

    public async Task<IResult> Handle(AddBillPriceCommand command, CancellationToken ct = default)
    {
        var bill = await billRepository.Query()
            .Where(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound(BillNotFound);

        var effectiveDate = command.EffectiveDate.ToUniversalTime();
        var endDate = command.EndDate?.ToUniversalTime();

        var existingEntries = await priceHistoryRepository.Query()
            .Where(ph => ph.BillId == command.BillId)
            .ToListAsync(ct);

        if (BillHelpers.IsOverlappingPriceRange(effectiveDate, endDate, existingEntries))
            return Results.Conflict("The specified date range overlaps with an existing price history entry.");

        var entry = new BillPriceHistory
        {
            BillId = command.BillId,
            Amount = command.Amount,
            EffectiveDate = effectiveDate,
            EndDate = endDate,
            Notes = command.Notes,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        priceHistoryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/bills/{command.BillId}/price-history/{entry.Id}", entry);
    }
}
