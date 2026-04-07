using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListItemsQuery(int ShoppingListId) : IRequest<IResult>;

public class GetShoppingListItemsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetShoppingListItemsQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListItemsQuery query, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == query.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound("Shopping list not found.");

        var items = await itemRepository.Query()
            .Where(i => i.ShoppingListId == query.ShoppingListId && i.CompletedOn == null)
            .ToListAsync(ct);
        return Results.Ok(items);
    }
}
