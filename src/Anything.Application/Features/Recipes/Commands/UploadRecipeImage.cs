using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Core.Upload;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record UploadRecipeImageCommand(
    int RecipeId,
    Stream ImageStream,
    string FileName,
    string ContentType,
    long ContentLength) : IRequest<IResult>;

public class UploadRecipeImageHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeImage> imageRepository,
    IImageStorageService imageStorageService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext) : IRequestHandler<UploadRecipeImageCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string InvalidFile = "No file uploaded or file is empty.";

    public async Task<IResult> Handle(UploadRecipeImageCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        if (command.ContentLength == 0)
            return Results.BadRequest(InvalidFile);

        if (UploadLimits.ExceedsMaxFileSize(command.ContentLength))
            return Results.BadRequest(UploadLimits.FileTooLargeMessage);

        var storageKey = await imageStorageService.Upload(
            command.ImageStream,
            command.FileName,
            command.ContentType,
            command.ContentLength,
            ct,
            folder: "recipes");

        var image = new RecipeImage
        {
            RecipeId = command.RecipeId,
            StorageKey = storageKey,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        imageRepository.Add(image);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/recipes/{command.RecipeId}/images/{image.Id}", value: null);
    }
}
