using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record CreateShoppingListCommand(string Name) : IRequest<ShoppingList>;

public class CreateShoppingListHandler(IRepository<ShoppingList> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateShoppingListCommand, ShoppingList>
{
    public async Task<ShoppingList> Handle(CreateShoppingListCommand command, CancellationToken ct = default)
    {
        var list = new ShoppingList { Name = command.Name, CreatedOn = timeProvider.GetUtcNow().UtcDateTime };
        repository.Add(list);
        await unitOfWork.SaveChanges(ct);
        return list;
    }
}
