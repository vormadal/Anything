using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CompleteShoppingListCommand(int Id) : IRequest<IResult>;

public class CompleteShoppingListHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CompleteShoppingListCommand, IResult>
{
    public async Task<IResult> Handle(CompleteShoppingListCommand command, CancellationToken ct = default)
    {
        var list = await listRepository.GetById(command.Id);
        if (list is null || list.DeletedOn != null)
            return Results.NotFound();

        var now = timeProvider.GetUtcNow().UtcDateTime;

        var items = await itemRepository.Query()
            .Where(i => i.ShoppingListId == command.Id)
            .ToListAsync(ct);

        foreach (var item in items)
        {
            if (!item.IsChecked)
            {
                item.IsChecked = true;
                item.ModifiedOn = now;
            }
        }

        list.DeletedOn = now;

        var newList = new ShoppingList { Name = list.Name, CreatedOn = timeProvider.GetUtcNow().UtcDateTime };
        listRepository.Add(newList);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/shopping-lists/{newList.Id}", newList);
    }
}
