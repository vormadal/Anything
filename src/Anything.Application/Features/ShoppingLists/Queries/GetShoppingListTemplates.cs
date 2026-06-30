using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListTemplatesQuery : IRequest<List<ShoppingListTemplateResponse>>;

public class GetShoppingListTemplatesHandler(IRepository<ShoppingList> listRepository, IRepository<ShoppingListItem> itemRepository, IHouseholdContext householdContext)
    : IRequestHandler<GetShoppingListTemplatesQuery, List<ShoppingListTemplateResponse>>
{
    public async Task<List<ShoppingListTemplateResponse>> Handle(GetShoppingListTemplatesQuery query, CancellationToken ct = default)
    {
        return await listRepository.Query()
            .Where(l => l.DeletedOn == null && l.IsTemplate && l.HouseholdId == householdContext.HouseholdId)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.CreatedOn)
            .GroupJoin(
                itemRepository.Query(),
                l => l.Id,
                i => i.ShoppingListId,
                (l, items) => new ShoppingListTemplateResponse(
                    l.Id,
                    l.Name,
                    (int)l.Type,
                    items.Count(),
                    l.CreatedOn,
                    l.ModifiedOn))
            .ToListAsync(ct);
    }
}
