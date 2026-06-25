using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record UpdateShoppingListItemCommand(int ShoppingListId, int ItemId, string Name, bool IsChecked, decimal? Amount, string? Unit) : IRequest<IResult>;

public class UpdateShoppingListItemHandler(IRepository<ShoppingList> listRepository, IRepository<ShoppingListItem> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider, IRealtimeNotifier realtimeNotifier, IUnitCatalog unitCatalog)
    : IRequestHandler<UpdateShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(UpdateShoppingListItemCommand command, CancellationToken ct = default)
    {
        var listExists = await listRepository.Query()
            .AnyAsync(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId, ct);
        if (!listExists)
            return Results.NotFound();

        var item = await repository.Query()
            .FirstOrDefaultAsync(i => i.Id == command.ItemId && i.ShoppingListId == command.ShoppingListId, ct);
        if (item is null)
            return Results.NotFound();

        var now = timeProvider.GetUtcNow().UtcDateTime;

        item.Name = command.Name;
        item.IsChecked = command.IsChecked;
        item.Amount = command.Amount;
        item.Unit = command.Unit;
        item.ModifiedOn = now;

        await unitCatalog.EnsureUnit(command.Unit, ct);

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), ct);
        return Results.NoContent();
    }
}
