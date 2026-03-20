using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Commands;

public record DeleteBillCommand(int Id) : IRequest<IResult>;

public class DeleteBillHandler(
    IRepository<Bill> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<DeleteBillCommand, IResult>
{
    public async Task<IResult> Handle(DeleteBillCommand command, CancellationToken ct = default)
    {
        var bill = await repository.GetById(command.Id);
        if (bill is null || bill.DeletedOn != null)
            return Results.NotFound();

        bill.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
