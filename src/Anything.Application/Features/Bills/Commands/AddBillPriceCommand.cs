using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Commands;

public record AddBillPriceCommand(
    int BillId,
    decimal Amount,
    DateTime EffectiveDate,
    string? Notes) : IRequest<IResult>;

public class AddBillPriceHandler(
    IRepository<Bill> billRepository,
    IRepository<BillPriceHistory> priceHistoryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<AddBillPriceCommand, IResult>
{
    public async Task<IResult> Handle(AddBillPriceCommand command, CancellationToken ct = default)
    {
        var bill = await billRepository.GetById(command.BillId);
        if (bill is null || bill.DeletedOn != null)
            return Results.NotFound("Bill not found.");

        var entry = new BillPriceHistory
        {
            BillId = command.BillId,
            Amount = command.Amount,
            EffectiveDate = command.EffectiveDate.ToUniversalTime(),
            Notes = command.Notes,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        priceHistoryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/bills/{command.BillId}/price-history/{entry.Id}", entry);
    }
}
