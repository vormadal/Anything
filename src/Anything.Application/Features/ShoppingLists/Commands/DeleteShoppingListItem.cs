using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record DeleteShoppingListItemCommand(int ShoppingListId, int ItemId) : IRequest<IResult>;

public class DeleteShoppingListItemHandler(IRepository<ShoppingListItem> repository, IUnitOfWork unitOfWork, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<DeleteShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(DeleteShoppingListItemCommand command, CancellationToken ct = default)
    {
        var item = await repository.GetById(command.ItemId);
        if (item is null || item.ShoppingListId != command.ShoppingListId)
            return Results.NotFound();

        repository.Remove(item);
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), ct);
        return Results.NoContent();
    }
}
