using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeImageCommand(int RecipeId, int ImageId) : IRequest<IResult>;

public class DeleteRecipeImageHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeImage> repository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRecipeImageCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string ImageNotFound = "Image not found.";

    public async Task<IResult> Handle(DeleteRecipeImageCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var image = await repository.Query()
            .FirstOrDefaultAsync(i => i.Id == command.ImageId && i.DeletedOn == null && i.RecipeId == command.RecipeId, ct);
        if (image is null)
            return Results.NotFound(ImageNotFound);

        await imageStorageService.Delete(image.StorageKey, ct);

        image.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
