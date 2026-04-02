using Anything.Application.Services;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record ReimportRecipeCommand(
    int RecipeId,
    bool ImportName,
    bool ImportIngredients,
    bool ImportSteps,
    bool ImportImages) : IRequest<IResult>;

public class ReimportRecipeHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IRepository<RecipeImage> imageRepository,
    IRecipeParserService parserService,
    IRecipeImageService recipeImageService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<ReimportRecipeCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string RecipeHasNoLink = "Recipe does not have a URL to reimport from.";
    private const string ParseFailed = "No recipe data could be extracted from the URL.";

    public async Task<IResult> Handle(ReimportRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        if (string.IsNullOrWhiteSpace(recipe.Link))
            return Results.BadRequest(RecipeHasNoLink);

        ParsedRecipeResponse? parsed;
        try
        {
            parsed = await parserService.ParseFromUrl(recipe.Link, ct);
        }
        catch (HttpRequestException)
        {
            return Results.BadRequest("Failed to fetch the recipe URL.");
        }

        if (parsed is null)
            return Results.UnprocessableEntity(ParseFailed);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (command.ImportName && !string.IsNullOrWhiteSpace(parsed.Name))
        {
            recipe.Name = parsed.Name;
            recipe.ModifiedOn = now;
        }

        if (command.ImportIngredients)
        {
            await DeleteExisting(ingredientRepository,
                ingredientRepository.Query().Where(i => i.RecipeId == command.RecipeId && i.DeletedOn == null), ct);

            var newIngredients = (parsed.Ingredients ?? []).Select(i => new RecipeIngredient
            {
                RecipeId = command.RecipeId,
                Name = i.Name,
                Amount = i.Amount.HasValue && i.Amount < 0 ? 0 : i.Amount,
                Unit = i.Unit,
                CreatedOn = now
            }).ToList();

            ingredientRepository.AddRange(newIngredients);
        }

        if (command.ImportSteps)
        {
            await DeleteExisting(stepRepository,
                stepRepository.Query().Where(s => s.RecipeId == command.RecipeId && s.DeletedOn == null), ct);

            var newSteps = (parsed.Steps ?? []).Select(s => new RecipeStep
            {
                RecipeId = command.RecipeId,
                Text = s.Text,
                Order = s.Order,
                CreatedOn = now
            }).ToList();

            stepRepository.AddRange(newSteps);
        }

        if (command.ImportImages && !string.IsNullOrWhiteSpace(parsed.ImageUrl))
        {
            await DeleteExisting(imageRepository,
                imageRepository.Query().Where(img => img.RecipeId == command.RecipeId && img.DeletedOn == null), ct);

            var storageKey = await recipeImageService.DownloadAndStoreAsync(parsed.ImageUrl, ct);
            if (storageKey is not null)
            {
                imageRepository.Add(new RecipeImage
                {
                    RecipeId = command.RecipeId,
                    StorageKey = storageKey,
                    CreatedOn = now
                });
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }

    private static async Task DeleteExisting<T>(IRepository<T> repository, IQueryable<T> query, CancellationToken ct)
        where T : class
    {
        var existing = await query.ToListAsync(ct);
        foreach (var item in existing)
            repository.Remove(item);
    }
}
