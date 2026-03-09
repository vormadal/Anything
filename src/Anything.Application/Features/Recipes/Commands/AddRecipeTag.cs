using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeTagCommand(int RecipeId, string Name) : IRequest<IResult>;

public class AddRecipeTagHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRecipeTagCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeTagCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var tag = new RecipeTag
        {
            RecipeId = command.RecipeId,
            Name = command.Name,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        tagRepository.Add(tag);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/recipes/{command.RecipeId}/tags/{tag.Id}", tag);
    }
}
