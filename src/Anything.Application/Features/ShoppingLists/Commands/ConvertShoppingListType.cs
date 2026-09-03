using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record ConvertShoppingListTypeCommand(int Id, ListType NewType) : IRequest<IResult>;

public class ConvertShoppingListTypeHandler(
    IRepository<ShoppingList> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<ConvertShoppingListTypeCommand, IResult>
{
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(ConvertShoppingListTypeCommand command, CancellationToken ct = default)
    {
        var list = await repository.Query()
            .Where(l => l.Id == command.Id && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound(ShoppingListNotFound);

        list.Type = command.NewType;
        list.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), householdContext.HouseholdId, ct);
        return Results.NoContent();
    }
}
