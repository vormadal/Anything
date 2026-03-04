using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryBoxCommand(int Id) : IRequest<IResult>;

public class DeleteInventoryBoxHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryItem> itemRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteInventoryBoxCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInventoryBoxCommand command, CancellationToken ct = default)
    {
        var box = await boxRepository.GetById(command.Id);
        if (box is null || box.DeletedOn != null)
            return Results.NotFound();

        box.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;

        var itemsInBox = await itemRepository.Query()
            .Where(i => i.BoxId == command.Id && i.DeletedOn == null)
            .ToListAsync(ct);

        foreach (var item in itemsInBox)
        {
            item.BoxId = null;
            item.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
