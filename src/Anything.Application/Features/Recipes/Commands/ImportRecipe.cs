using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.Extensions.Logging;
using System.Net.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record ImportRecipeIngredient(string Name, decimal? Amount, string? Unit, string? Group);

public record ImportRecipeStep(string Text, int Order);

public record ImportRecipeCommand(
    string Name,
    string? Link,
    string? Notes,
    IReadOnlyList<ImportRecipeIngredient> Ingredients,
    IReadOnlyList<ImportRecipeStep> Steps,
    string? ImageUrl) : IRequest<Recipe>;

public class ImportRecipeHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IRepository<RecipeImage> imageRepository,
    IImageStorageService imageStorageService,
    IHttpClientFactory httpClientFactory,
    IUnitOfWork unitOfWork,
    ILogger<ImportRecipeHandler> logger,
    TimeProvider timeProvider) : IRequestHandler<ImportRecipeCommand, Recipe>
{
    public async Task<Recipe> Handle(ImportRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = new Recipe
        {
            Name = command.Name,
            Link = command.Link,
            Notes = command.Notes
        };

        recipeRepository.Add(recipe);
        await unitOfWork.SaveChanges(ct);

        var ingredients = command.Ingredients.Select(i => new RecipeIngredient
        {
            RecipeId = recipe.Id,
            Name = i.Name,
            Amount = i.Amount.HasValue && i.Amount < 0 ? 0 : i.Amount,
            Unit = i.Unit,
            Group = i.Group
        }).ToList();

        var steps = command.Steps.Select(s => new RecipeStep
        {
            RecipeId = recipe.Id,
            Text = s.Text,
            Order = s.Order
        }).ToList();

        ingredientRepository.AddRange(ingredients);
        stepRepository.AddRange(steps);

        if (command.ImageUrl is not null)
        {
            var storageKey = await DownloadAndStoreImage(command.ImageUrl, ct);
            if (storageKey is not null)
            {
                imageRepository.Add(new RecipeImage
                {
                    RecipeId = recipe.Id,
                    StorageKey = storageKey,
                    CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                });
            }
        }

        await unitOfWork.SaveChanges(ct);

        return recipe;
    }

    private async Task<string?> DownloadAndStoreImage(string imageUrl, CancellationToken ct)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            using var response = await httpClient.GetAsync(imageUrl, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            var fileName = Path.GetFileName(new Uri(imageUrl).AbsolutePath);
            if (string.IsNullOrWhiteSpace(fileName))
                fileName = "recipe-image.jpg";

            await using var imageStream = await response.Content.ReadAsStreamAsync(ct);
            using var buffer = new MemoryStream();
            await imageStream.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            return await imageStorageService.Upload(buffer, fileName, contentType, buffer.Length, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to download image from {ImageUrl}", imageUrl);
            return null;
        }
    }
}
