using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record UpdateRecipeCommand(int Id, string Name, string? Link, string? Notes) : IRequest<IResult>;

public class UpdateRecipeHandler(IRepository<Recipe> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateRecipeCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(UpdateRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = await repository.GetById(command.Id);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        recipe.Name = command.Name;
        recipe.Link = command.Link;
        recipe.Notes = command.Notes;
        recipe.ModifiedOn = DateTime.UtcNow;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
