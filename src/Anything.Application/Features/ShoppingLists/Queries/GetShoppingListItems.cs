using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListItemsQuery(int ShoppingListId) : IRequest<IResult>;

public class GetShoppingListItemsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository) : IRequestHandler<GetShoppingListItemsQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListItemsQuery query, CancellationToken ct = default)
    {
        var list = await listRepository.GetById(query.ShoppingListId);
        if (list is null)
            return Results.NotFound("Shopping list not found.");

        var items = await itemRepository.Query()
            .Where(i => i.ShoppingListId == query.ShoppingListId)
            .ToListAsync(ct);
        return Results.Ok(items);
    }
}
