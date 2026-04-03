using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CreateShoppingListCommand(string Name) : IRequest<ShoppingList>;

public class CreateShoppingListHandler(IRepository<ShoppingList> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<CreateShoppingListCommand, ShoppingList>
{
    public async Task<ShoppingList> Handle(CreateShoppingListCommand command, CancellationToken ct = default)
    {
        var lastList = await repository.Query()
            .Where(l => l.DeletedOn == null)
            .OrderByDescending(l => l.SortOrder)
            .FirstOrDefaultAsync(ct);

        var list = new ShoppingList
        {
            Name = command.Name,
            SortOrder = lastList == null ? 0 : lastList.SortOrder + 1,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repository.Add(list);
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), ct);
        return list;
    }
}
