using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record ReorderShoppingListItemsCommand(int ShoppingListId, List<int> Ids) : IRequest<IResult>;

public class ReorderShoppingListItemsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<ReorderShoppingListItemsCommand, IResult>
{
    public async Task<IResult> Handle(ReorderShoppingListItemsCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);

        if (list is null)
        {
            return Results.NotFound();
        }

        var items = await itemRepository.Query()
            .Where(i => i.ShoppingListId == command.ShoppingListId && i.CompletedOn == null && command.Ids.Contains(i.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var item = items.FirstOrDefault(it => it.Id == command.Ids[i]);
            if (item is not null)
            {
                item.SortOrder = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), householdContext.HouseholdId, ct);
        return Results.NoContent();
    }
}
