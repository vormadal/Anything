using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListsQuery : IRequest<List<ShoppingList>>;

public class GetShoppingListsHandler(IRepository<ShoppingList> repository)
    : IRequestHandler<GetShoppingListsQuery, List<ShoppingList>>
{
    public async Task<List<ShoppingList>> Handle(GetShoppingListsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(l => l.DeletedOn == null)
            .ToListAsync(ct);
    }
}
