using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record AddShoppingListItemCommand(int ShoppingListId, string Name, decimal? Amount, string? Unit) : IRequest<IResult>;

public class AddShoppingListItemHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<AddShoppingListItemCommand, IResult>
{
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(AddShoppingListItemCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == command.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound(ShoppingListNotFound);

        var isGeneral = list.Type == ListType.General;

        var item = new ShoppingListItem
        {
            ShoppingListId = command.ShoppingListId,
            Name = command.Name,
            Amount = isGeneral ? null : command.Amount,
            Unit = isGeneral ? null : command.Unit,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        itemRepository.Add(item);

        if (!isGeneral)
        {
            var nameNormalized = command.Name.Trim();
            var exists = await recommendationRepository.Query()
                .AnyAsync(r => r.Name.ToLower() == nameNormalized.ToLower(), ct);
            if (!exists)
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    HouseholdId = householdContext.HouseholdId,
                    Name = nameNormalized,
                    IsApproved = true,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
            }
        }

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), ct);
        return Results.Created($"/api/checklists/{command.ShoppingListId}/items/{item.Id}", item);
    }
}
