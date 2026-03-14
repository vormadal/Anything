using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record ReorderShoppingListsCommand(List<int> Ids) : IRequest<IResult>;

public class ReorderShoppingListsHandler(IRepository<ShoppingList> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<ReorderShoppingListsCommand, IResult>
{
    public async Task<IResult> Handle(ReorderShoppingListsCommand command, CancellationToken ct = default)
    {
        var lists = await repository.Query()
            .Where(l => l.DeletedOn == null && command.Ids.Contains(l.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var list = lists.FirstOrDefault(l => l.Id == command.Ids[i]);
            if (list != null)
            {
                list.SortOrder = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
