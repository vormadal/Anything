using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record DeleteShoppingListCommand(int Id) : IRequest<IResult>;

public class DeleteShoppingListHandler(IRepository<ShoppingList> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider, IRealtimeNotifier realtimeNotifier)
    : IRequestHandler<DeleteShoppingListCommand, IResult>
{
    public async Task<IResult> Handle(DeleteShoppingListCommand command, CancellationToken ct = default)
    {
        var list = await repository.Query()
            .Where(l => l.Id == command.Id && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound();

        list.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), householdContext.HouseholdId, ct);
        return Results.NoContent();
    }
}
