using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record AddBillAmountEntryCommand(
    int BillId,
    decimal Amount,
    DateTime PeriodDate,
    string? Notes) : IRequest<IResult>;

public class AddBillAmountEntryHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAmountEntry> amountEntryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<AddBillAmountEntryCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";

    public async Task<IResult> Handle(AddBillAmountEntryCommand command, CancellationToken ct = default)
    {
        var bill = await billRepository.Query()
            .Where(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound(BillNotFound);

        var entry = new BillAmountEntry
        {
            BillId = command.BillId,
            Amount = command.Amount,
            PeriodDate = command.PeriodDate.ToUniversalTime(),
            Notes = command.Notes,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        amountEntryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);

        var response = new BillAmountEntryResponse(
            entry.Id,
            entry.BillId,
            entry.Amount,
            entry.PeriodDate,
            entry.Notes,
            entry.CreatedOn,
            entry.ModifiedOn);

        return Results.Created($"/api/bills/{command.BillId}/amount-entries/{entry.Id}", response);
    }
}
