using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CompleteShoppingListCommand(int Id, bool MarkUnchecked = false) : IRequest<IResult>;

public class CompleteShoppingListHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<CompleteShoppingListCommand, IResult>
{
    public async Task<IResult> Handle(CompleteShoppingListCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == command.Id && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound();

        var now = timeProvider.GetUtcNow().UtcDateTime;

        var items = await itemRepository.Query()
            .Where(i => i.ShoppingListId == command.Id && i.CompletedOn == null)
            .ToListAsync(ct);

        if (command.MarkUnchecked)
        {
            foreach (var item in items)
            {
                item.IsChecked = true;
                item.CompletedOn = now;
                item.ModifiedOn = now;
            }
        }
        else
        {
            foreach (var item in items.Where(i => i.IsChecked))
            {
                item.CompletedOn = now;
                item.ModifiedOn = now;
            }
        }

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.Id), ct);
        return Results.NoContent();
    }
}
