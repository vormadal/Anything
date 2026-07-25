using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CreateShoppingListCommand(string Name, ListType Type = ListType.Shopping, bool IsTemplate = false) : IRequest<ShoppingList>;

public class CreateShoppingListHandler(IRepository<ShoppingList> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<CreateShoppingListCommand, ShoppingList>
{
    public async Task<ShoppingList> Handle(CreateShoppingListCommand command, CancellationToken ct = default)
    {
        var list = new ShoppingList
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            Type = command.Type,
            IsTemplate = command.IsTemplate,
            SortOrder = await ShoppingListHelpers.GetNextListSortOrder(repository, householdContext.HouseholdId, command.IsTemplate, ct),
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repository.Add(list);
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(command.IsTemplate ? SyncEvent.ShoppingListTemplates() : SyncEvent.ShoppingLists(), ct);
        return list;
    }
}
