using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListsQuery : IRequest<List<ShoppingListResponse>>;

public class GetShoppingListsHandler(IRepository<ShoppingList> listRepository, IRepository<ShoppingListItem> itemRepository)
    : IRequestHandler<GetShoppingListsQuery, List<ShoppingListResponse>>
{
    public async Task<List<ShoppingListResponse>> Handle(GetShoppingListsQuery query, CancellationToken ct = default)
    {
        return await listRepository.Query()
            .Where(l => l.DeletedOn == null)
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.CreatedOn)
            .GroupJoin(
                itemRepository.Query().Where(i => i.CompletedOn == null),
                l => l.Id,
                i => i.ShoppingListId,
                (l, items) => new ShoppingListResponse(
                    l.Id,
                    l.Name,
                    l.CreatedOn,
                    l.ModifiedOn,
                    l.DeletedOn,
                    items.Count()))
            .ToListAsync(ct);
    }
}
