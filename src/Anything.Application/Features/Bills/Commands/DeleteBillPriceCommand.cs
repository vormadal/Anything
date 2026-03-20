using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record DeleteBillPriceCommand(int BillId, int HistoryId) : IRequest<IResult>;

public class DeleteBillPriceHandler(
    IRepository<BillPriceHistory> priceHistoryRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteBillPriceCommand, IResult>
{
    public async Task<IResult> Handle(DeleteBillPriceCommand command, CancellationToken ct = default)
    {
        var entry = await priceHistoryRepository.Query()
            .FirstOrDefaultAsync(ph => ph.Id == command.HistoryId && ph.BillId == command.BillId, ct);

        if (entry is null)
            return Results.NotFound();

        // NOTE: BillPriceHistory is intentionally hard-deleted here.
        // Most entities in the system use a soft-delete pattern (via DeletedOn),
        // but price history entries are treated as truly removable records.
        priceHistoryRepository.Remove(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
