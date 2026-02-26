using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeCommand(int Id) : IRequest<IResult>;

public class DeleteRecipeHandler(IRepository<Recipe> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteRecipeCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(DeleteRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = await repository.GetById(command.Id);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        recipe.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
