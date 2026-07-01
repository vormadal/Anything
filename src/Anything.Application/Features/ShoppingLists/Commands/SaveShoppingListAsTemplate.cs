using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record SaveShoppingListAsTemplateCommand(int Id, string? Name) : IRequest<IResult>;

public class SaveShoppingListAsTemplateHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<SaveShoppingListAsTemplateCommand, IResult>
{
    private const string ShoppingListNotFound = "Shopping list not found.";

    public async Task<IResult> Handle(SaveShoppingListAsTemplateCommand command, CancellationToken ct = default)
    {
        var source = await listRepository.Query()
            .Where(l => l.Id == command.Id && l.DeletedOn == null && !l.IsTemplate && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (source is null)
            return Results.NotFound(ShoppingListNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var name = string.IsNullOrWhiteSpace(command.Name) ? source.Name : command.Name.Trim();

        var template = new ShoppingList
        {
            HouseholdId = householdContext.HouseholdId,
            Name = name,
            Type = source.Type,
            IsTemplate = true,
            SortOrder = await ShoppingListHelpers.GetNextListSortOrder(listRepository, householdContext.HouseholdId, isTemplate: true, ct),
            CreatedOn = now
        };
        listRepository.Add(template);
        await unitOfWork.SaveChanges(ct);

        var sourceItems = await itemRepository.Query()
            .Where(i => i.ShoppingListId == source.Id && i.CompletedOn == null)
            .ToListAsync(ct);
        foreach (var item in ShoppingListHelpers.CopyItems(sourceItems, template.Id, now))
        {
            itemRepository.Add(item);
        }
        await unitOfWork.SaveChanges(ct);

        await realtimeNotifier.Notify(SyncEvent.ShoppingListTemplates(), ct);
        return Results.Created($"/api/checklists/templates/{template.Id}", template);
    }
}
