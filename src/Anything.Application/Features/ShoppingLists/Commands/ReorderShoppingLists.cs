using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record ReorderShoppingListsCommand(List<int> Ids) : IRequest<IResult>;

public class ReorderShoppingListsHandler(IRepository<ShoppingList> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<ReorderShoppingListsCommand, IResult>
{
    public async Task<IResult> Handle(ReorderShoppingListsCommand command, CancellationToken ct = default)
    {
        var lists = await repository.Query()
            .Where(l => l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId && command.Ids.Contains(l.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var list = lists.FirstOrDefault(l => l.Id == command.Ids[i]);
            if (list != null)
            {
                list.SortOrder = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), householdContext.HouseholdId, ct);
        return Results.NoContent();
    }
}
