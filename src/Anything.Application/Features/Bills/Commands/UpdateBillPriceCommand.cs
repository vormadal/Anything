using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record UpdateBillPriceCommand(
    int BillId,
    int HistoryId,
    decimal Amount,
    DateTime EffectiveDate,
    DateTime? EndDate,
    string? Notes) : IRequest<IResult>;

public class UpdateBillPriceHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateBillPriceCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";

    public async Task<IResult> Handle(UpdateBillPriceCommand command, CancellationToken ct = default)
    {
        var billExists = await billRepository.Query()
            .AnyAsync(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!billExists)
            return Results.NotFound(BillNotFound);

        var entry = await priceHistoryRepository.Query()
            .FirstOrDefaultAsync(ph => ph.Id == command.HistoryId && ph.BillId == command.BillId, ct);

        if (entry is null)
            return Results.NotFound();

        var effectiveDate = command.EffectiveDate.ToUniversalTime();
        var endDate = command.EndDate?.ToUniversalTime();

        // Validate price range for overlaps with other entries (excluding self)
        var otherEntries = await priceHistoryRepository.Query()
            .Where(ph => ph.BillId == command.BillId && ph.Id != command.HistoryId)
            .ToListAsync(ct);

        if (IsOverlappingWithExisting(effectiveDate, endDate, otherEntries))
            return Results.Conflict("The specified date range overlaps with an existing price history entry.");

        entry.Amount = command.Amount;
        entry.EffectiveDate = effectiveDate;
        entry.EndDate = endDate;
        entry.Notes = command.Notes;
        entry.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }

    private static bool IsOverlappingWithExisting(DateTime effectiveDate, DateTime? endDate, List<BillPriceHistory> existing)
    {
        foreach (var entry in existing)
        {
            // Check if ranges overlap
            var existingEnd = entry.EndDate ?? DateTime.MaxValue;
            var newEnd = endDate ?? DateTime.MaxValue;

            if (effectiveDate < existingEnd && newEnd > entry.EffectiveDate)
                return true;
        }

        return false;
    }
}
