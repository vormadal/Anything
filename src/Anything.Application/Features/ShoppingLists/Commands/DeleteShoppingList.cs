using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record DeleteShoppingListCommand(int Id) : IRequest<IResult>;

public class DeleteShoppingListHandler(IRepository<ShoppingList> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<DeleteShoppingListCommand, IResult>
{
    public async Task<IResult> Handle(DeleteShoppingListCommand command, CancellationToken ct = default)
    {
        var list = await repository.GetById(command.Id);
        if (list is null || list.DeletedOn != null)
            return Results.NotFound();

        list.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), ct);
        return Results.NoContent();
    }
}
