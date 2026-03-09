using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.ShoppingLists.Commands;

public record UpdateShoppingListCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateShoppingListHandler(IRepository<ShoppingList> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateShoppingListCommand, IResult>
{
    public async Task<IResult> Handle(UpdateShoppingListCommand command, CancellationToken ct = default)
    {
        var list = await repository.GetById(command.Id);
        if (list is null || list.DeletedOn is not null)
            return Results.NotFound();

        list.Name = command.Name;
        list.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
