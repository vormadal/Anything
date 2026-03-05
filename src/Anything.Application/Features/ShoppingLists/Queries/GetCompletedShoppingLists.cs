using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetCompletedShoppingListsQuery : IRequest<List<ShoppingList>>;

public class GetCompletedShoppingListsHandler(IRepository<ShoppingList> repository)
    : IRequestHandler<GetCompletedShoppingListsQuery, List<ShoppingList>>
{
    public async Task<List<ShoppingList>> Handle(GetCompletedShoppingListsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(l => l.DeletedOn != null)
            .OrderByDescending(l => l.DeletedOn)
            .ToListAsync(ct);
    }
}
