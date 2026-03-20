using Anything.Core.Entities;
using Anything.Core.Repositories;
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
        await unitOfWork.SaveChanges(ct);

        if (command.InitialAmount is not null)
        {
            var priceEntry = new BillPriceHistory
            {
                BillId = bill.Id,
                Amount = command.InitialAmount.Value,
                EffectiveDate = command.InitialEffectiveDate?.ToUniversalTime() ?? now,
                CreatedOn = now
            };
            priceHistoryRepository.Add(priceEntry);
            await unitOfWork.SaveChanges(ct);
        }

        return Results.Created($"/api/bills/{bill.Id}", bill);
    }
}
