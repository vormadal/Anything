using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record UpdateShoppingListItemCommand(int ShoppingListId, int ItemId, string Name, bool IsChecked, decimal? Amount, string? Unit) : IRequest<IResult>;

public class UpdateShoppingListItemHandler(IRepository<ShoppingListItem> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateShoppingListItemCommand, IResult>
{
    public async Task<IResult> Handle(UpdateShoppingListItemCommand command, CancellationToken ct = default)
    {
        var item = await repository.GetById(command.ItemId);
        if (item is null || item.ShoppingListId != command.ShoppingListId)
            return Results.NotFound();

        item.Name = command.Name;
        item.IsChecked = command.IsChecked;
        item.Amount = command.Amount;
        item.Unit = command.Unit;
        item.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
