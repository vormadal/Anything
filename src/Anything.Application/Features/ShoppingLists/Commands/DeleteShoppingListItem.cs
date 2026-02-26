using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record DeleteShoppingListItemCommand(int ShoppingListId, int ItemId) : IRequest<IResult>;

public class DeleteShoppingListItemHandler(IRepository<ShoppingListItem> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(DeleteShoppingListItemCommand command, CancellationToken ct = default)
    {
        var item = await repository.GetById(command.ItemId);
        if (item is null || item.DeletedOn != null || item.ShoppingListId != command.ShoppingListId)
            return Results.NotFound();

        item.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
