using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeImageCommand(int RecipeId, int ImageId) : IRequest<IResult>;

public class DeleteRecipeImageHandler(
    IRepository<RecipeImage> repository,
    IImageStorageService imageStorageService,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteRecipeImageCommand, IResult>
{
    private const string ImageNotFound = "Image not found.";

    public async Task<IResult> Handle(DeleteRecipeImageCommand command, CancellationToken ct = default)
    {
        var image = await repository.GetById(command.ImageId);
        if (image is null || image.DeletedOn != null || image.RecipeId != command.RecipeId)
            return Results.NotFound(ImageNotFound);

        await imageStorageService.Delete(image.StorageKey, ct);

        image.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
