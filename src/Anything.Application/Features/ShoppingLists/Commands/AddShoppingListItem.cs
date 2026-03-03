using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record AddShoppingListItemCommand(int ShoppingListId, string Name, decimal? Amount, string? Unit) : IRequest<IResult>;

public class AddShoppingListItemHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<AddShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(AddShoppingListItemCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.GetById(command.ShoppingListId);
        if (list is null || list.DeletedOn != null)
            return Results.NotFound("Shopping list not found.");

        var item = new ShoppingListItem
        {
            ShoppingListId = command.ShoppingListId,
            Name = command.Name,
            Amount = command.Amount,
            Unit = command.Unit
        };

        itemRepository.Add(item);

        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/shopping-lists/{command.ShoppingListId}/items/{item.Id}", item);
    }
}
