using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListByIdQuery(int Id) : IRequest<IResult>;

public class GetShoppingListByIdHandler(IRepository<ShoppingList> repository)
    : IRequestHandler<GetShoppingListByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is ShoppingList list && list.DeletedOn == null
            ? Results.Ok(list)
            : Results.NotFound();
    }
}
