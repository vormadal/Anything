using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Commands;

public record CreateBillCommand(
    string Name,
    int? VendorId,
    string Frequency,
    bool IsAutomated,
    int? LocationId,
    string? ManagementUrl,
    string? Category,
    string? Notes,
    decimal? InitialAmount,
    DateTime? InitialEffectiveDate) : IRequest<IResult>;

public class CreateBillHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<CreateBillCommand, IResult>
{
    public async Task<IResult> Handle(CreateBillCommand command, CancellationToken ct = default)
    {
        if (!BillHelpers.TryParseFrequency(command.Frequency, out var frequency))
            return Results.BadRequest($"Invalid frequency '{command.Frequency}'.");

        var now = timeProvider.GetUtcNow().UtcDateTime;

        var bill = new Bill
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            VendorId = command.VendorId,
            Frequency = frequency,
            IsAutomated = command.IsAutomated,
            LocationId = command.LocationId,
            ManagementUrl = command.ManagementUrl,
            Category = command.Category,
            Notes = command.Notes,
            CreatedOn = now
        };

        billRepository.Add(bill);

        if (command.InitialAmount is not null)
        {
            var priceEntry = new BillPriceHistory
            {
                Bill = bill,
                Amount = command.InitialAmount.Value,
                EffectiveDate = command.InitialEffectiveDate?.ToUniversalTime() ?? now,
                CreatedOn = now
            };
            priceHistoryRepository.Add(priceEntry);
        }

        await unitOfWork.SaveChanges(ct);

        var response = new BillResponse(
            bill.Id,
            bill.Name,
            bill.VendorId,
            null,
            null,
            frequency.ToString(),
            bill.IsAutomated,
            bill.LocationId,
            null,
            bill.ManagementUrl,
            bill.Category,
            bill.Notes,
            command.InitialAmount,
            BillHelpers.ComputeMonthlyEquivalent(frequency, command.InitialAmount),
            false,
            bill.CreatedOn,
            bill.ModifiedOn);

        return Results.Created($"/api/bills/{bill.Id}", response);
    }
}
