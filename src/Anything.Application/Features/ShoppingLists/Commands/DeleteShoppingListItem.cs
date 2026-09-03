using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record DeleteShoppingListItemCommand(int ShoppingListId, int ItemId) : IRequest<IResult>;

public class DeleteShoppingListItemHandler(IRepository<ShoppingList> listRepository, IRepository<ShoppingListItem> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<DeleteShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(DeleteShoppingListItemCommand command, CancellationToken ct = default)
    {
        var listExists = await listRepository.Query()
            .AnyAsync(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId, ct);
        if (!listExists)
            return Results.NotFound();

        var item = await repository.Query()
            .FirstOrDefaultAsync(i => i.Id == command.ItemId && i.ShoppingListId == command.ShoppingListId, ct);
        if (item is null)
            return Results.NotFound();

        repository.Remove(item);
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), householdContext.HouseholdId, ct);
        return Results.NoContent();
    }
}
