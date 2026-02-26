using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryItemCommand(int Id) : IRequest<IResult>;

public class DeleteInventoryItemHandler(IRepository<InventoryItem> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInventoryItemCommand command, CancellationToken ct = default)
    {
        var item = await repository.GetById(command.Id);
        if (item is null || item.DeletedOn != null)
            return Results.NotFound();

        item.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
