using Anything.Application.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CreateShoppingListFromTemplateCommand(int TemplateId, string? Name) : IRequest<IResult>;

public class CreateShoppingListFromTemplateHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IRealtimeNotifier realtimeNotifier) : IRequestHandler<CreateShoppingListFromTemplateCommand, IResult>
{
    private const string TemplateNotFound = "Template not found.";

    public async Task<IResult> Handle(CreateShoppingListFromTemplateCommand command, CancellationToken ct = default)
    {
        var template = await listRepository.Query()
            .Where(l => l.Id == command.TemplateId && l.DeletedOn == null && l.IsTemplate && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (template is null)
            return Results.NotFound(TemplateNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var name = string.IsNullOrWhiteSpace(command.Name) ? template.Name : command.Name.Trim();

        var list = new ShoppingList
        {
            HouseholdId = householdContext.HouseholdId,
            Name = name,
            Type = template.Type,
            SourceTemplateId = template.Id,
            SortOrder = await ShoppingListHelpers.GetNextListSortOrder(listRepository, householdContext.HouseholdId, isTemplate: false, ct),
            CreatedOn = now
        };
        listRepository.Add(list);
        await unitOfWork.SaveChanges(ct);

        var templateItems = await itemRepository.Query()
            .Where(i => i.ShoppingListId == template.Id)
            .ToListAsync(ct);
        foreach (var item in ShoppingListHelpers.CopyItems(templateItems, list.Id, now))
        {
            itemRepository.Add(item);
        }
        await unitOfWork.SaveChanges(ct);

        await realtimeNotifier.Notify(SyncEvent.ShoppingLists(), householdContext.HouseholdId, ct);
        return Results.Created($"/api/checklists/{list.Id}", list);
    }
}
