using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeImageCommand(int RecipeId, string Url) : IRequest<IResult>;

public class AddRecipeImageHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeImage> imageRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext) : IRequestHandler<AddRecipeImageCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeImageCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var image = new RecipeImage
        {
            RecipeId = command.RecipeId,
            StorageKey = command.Url,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        imageRepository.Add(image);
        await unitOfWork.SaveChanges(ct);

        return Results.Created(
            $"/api/recipes/{command.RecipeId}/images/{image.Id}",
            new { image.Id, image.RecipeId, Url = image.StorageKey });
    }
}
