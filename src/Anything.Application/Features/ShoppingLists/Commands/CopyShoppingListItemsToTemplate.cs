using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CopyShoppingListItemsToTemplateCommand(int ListId, List<int> ItemIds) : IRequest<IResult>;

public class CopyShoppingListItemsToTemplateHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<CopyShoppingListItemsToTemplateCommand, IResult>
{
    private const string ListNotFound = "Shopping list not found.";
    private const string NoSourceTemplate = "This list was not created from a template.";
    private const string TemplateNotFound = "Source template not found.";

    public async Task<IResult> Handle(CopyShoppingListItemsToTemplateCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == command.ListId && l.DeletedOn == null && !l.IsTemplate && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound(ListNotFound);
        if (list.SourceTemplateId is null)
            return Results.BadRequest(NoSourceTemplate);

        var template = await listRepository.Query()
            .Where(t => t.Id == list.SourceTemplateId && t.DeletedOn == null && t.IsTemplate && t.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (template is null)
            return Results.NotFound(TemplateNotFound);

        var selectedItems = await itemRepository.Query()
            .Where(i => i.ShoppingListId == list.Id && command.ItemIds.Contains(i.Id))
            .ToListAsync(ct);
        var templateItems = await itemRepository.Query()
            .Where(i => i.ShoppingListId == template.Id)
            .ToListAsync(ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var item in selectedItems)
        {
            ShoppingListHelpers.MergeOrAddItem(
                itemRepository, templateItems, template.Id, item.Name, item.Amount, item.Unit, item.AddedByRecipe, now);
        }
        await unitOfWork.SaveChanges(ct);

        await realtimeNotifier.Notify(SyncEvent.ShoppingListTemplates(), ct);
        return Results.NoContent();
    }
}
