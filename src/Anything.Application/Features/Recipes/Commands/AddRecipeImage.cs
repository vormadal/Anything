using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeImageCommand(int RecipeId, string Url) : IRequest<IResult>;

public class AddRecipeImageHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeImage> imageRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<AddRecipeImageCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeImageCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var image = new RecipeImage
        {
            RecipeId = command.RecipeId,
            Url = command.Url
        };

        imageRepository.Add(image);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/recipes/{command.RecipeId}/images/{image.Id}", image);
    }
}
