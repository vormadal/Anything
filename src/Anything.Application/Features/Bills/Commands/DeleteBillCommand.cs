using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record DeleteBillCommand(int Id) : IRequest<IResult>;

public class DeleteBillHandler(
    IRepository<Bill> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<DeleteBillCommand, IResult>
{
    public async Task<IResult> Handle(DeleteBillCommand command, CancellationToken ct = default)
    {
        var bill = await repository.Query()
            .Where(b => b.Id == command.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound();

        bill.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
