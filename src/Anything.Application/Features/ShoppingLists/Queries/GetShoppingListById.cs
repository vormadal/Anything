using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListByIdQuery(int Id) : IRequest<IResult>;

public class GetShoppingListByIdHandler(IRepository<ShoppingList> repository)
    : IRequestHandler<GetShoppingListByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListByIdQuery query, CancellationToken ct = default)
    {
        var list = await repository.Query()
            .Where(l => l.Id == query.Id && l.DeletedOn == null)
            .FirstOrDefaultAsync(ct);
        return list is not null ? Results.Ok(list) : Results.NotFound();
    }
}
