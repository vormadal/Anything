using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record UpdateBillPriceCommand(
    int BillId,
    int HistoryId,
    decimal Amount,
    DateTime EffectiveDate,
    string? Notes) : IRequest<IResult>;

public class UpdateBillPriceHandler(
    IRepository<BillPriceHistory> priceHistoryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateBillPriceCommand, IResult>
{
    public async Task<IResult> Handle(UpdateBillPriceCommand command, CancellationToken ct = default)
    {
        var entry = await priceHistoryRepository.Query()
            .FirstOrDefaultAsync(ph => ph.Id == command.HistoryId && ph.BillId == command.BillId, ct);

        if (entry is null)
            return Results.NotFound();

        entry.Amount = command.Amount;
        entry.EffectiveDate = command.EffectiveDate.ToUniversalTime();
        entry.Notes = command.Notes;
        entry.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
