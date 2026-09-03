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
    IRealtimeNotifier realtimeNotifier,
    IUnitCatalog unitCatalog) : IRequestHandler<AddShoppingListItemCommand, IResult>
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
        var maxSortOrder = await itemRepository.Query()
            .Where(i => i.ShoppingListId == command.ShoppingListId && i.CompletedOn == null)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(ct) ?? -1;

        var item = new ShoppingListItem
        {
            ShoppingListId = command.ShoppingListId,
            SortOrder = maxSortOrder + 1,
            Name = command.Name,
            Amount = isGeneral ? null : command.Amount,
            Unit = isGeneral ? null : command.Unit,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        itemRepository.Add(item);

        if (!isGeneral)
        {
            var nameNormalized = command.Name.Trim();
            // A suggestion already covers this name if it's this list's own or a shared (null-list) one.
            var exists = await recommendationRepository.Query()
                .AnyAsync(r => r.HouseholdId == householdContext.HouseholdId
                               && (r.ShoppingListId == command.ShoppingListId || r.ShoppingListId == null)
                               && r.Name.ToLower() == nameNormalized.ToLower(), ct);
            if (!exists)
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    HouseholdId = householdContext.HouseholdId,
                    ShoppingListId = command.ShoppingListId,
                    Name = nameNormalized,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
            }

            await unitCatalog.EnsureUnit(command.Unit, ct);
        }

        await unitOfWork.SaveChanges(ct);
        await realtimeNotifier.Notify(SyncEvent.ShoppingListItems(command.ShoppingListId), householdContext.HouseholdId, ct);
        return Results.Created($"/api/checklists/{command.ShoppingListId}/items/{item.Id}", item);
    }
}
