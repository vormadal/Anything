using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record ImportRecipeTagsCommand(List<RecipeTagImportExportItem> Recipes) : IRequest<IResult>;

public class ImportRecipeTagsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<ImportRecipeTagsCommand, IResult>
{
    private const int MaxTagNameLength = 50;
    private const string RecipeNameField = "recipeName";
    private const string TagsField = "tags";
    private const string RecipesField = "recipes";

    public async Task<IResult> Handle(ImportRecipeTagsCommand command, CancellationToken ct = default)
    {
        var importByRecipeName = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in command.Recipes)
        {
            if (string.IsNullOrWhiteSpace(item.RecipeName))
                return ValidationError(RecipeNameField, "Recipe name is required.");
            var recipeName = item.RecipeName.Trim();
            var (normalizedTags, validationError) = NormalizeTags(item.Tags);

            if (validationError is not null)
                return ValidationError(TagsField, validationError);

            if (!importByRecipeName.TryAdd(recipeName, normalizedTags))
                return ValidationError(RecipesField, $"Duplicate recipe name in import: {recipeName}");
        }

        var allRecipes = await recipeRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(ct);

        var recipesByName = new Dictionary<string, (int Id, string Name)>(StringComparer.OrdinalIgnoreCase);
        foreach (var recipe in allRecipes)
        {
            if (recipesByName.ContainsKey(recipe.Name))
                return ValidationError(RecipesField, $"Recipe name is not unique: {recipe.Name}");

            recipesByName[recipe.Name] = (recipe.Id, recipe.Name);
        }

        var missingRecipes = importByRecipeName.Keys
            .Where(name => !recipesByName.ContainsKey(name))
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (missingRecipes.Count > 0)
            return ValidationError(RecipesField, $"Recipe(s) not found: {string.Join(", ", missingRecipes)}");

        var targetRecipeIds = importByRecipeName.Keys
            .Select(name => recipesByName[name].Id)
            .ToHashSet();

        var existingTags = await tagRepository.Query()
            .Where(t => targetRecipeIds.Contains(t.RecipeId) && t.DeletedOn == null)
            .ToListAsync(ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var (recipeName, incomingTags) in importByRecipeName)
        {
            var recipeId = recipesByName[recipeName].Id;
            var currentTags = existingTags
                .Where(t => t.RecipeId == recipeId)
                .ToList();

            var incomingTagSet = new HashSet<string>(incomingTags, StringComparer.OrdinalIgnoreCase);

            foreach (var currentTag in currentTags.Where(t => !incomingTagSet.Contains(t.Name)))
            {
                currentTag.DeletedOn = now;
            }

            var existingTagSet = new HashSet<string>(
                currentTags.Select(t => t.Name),
                StringComparer.OrdinalIgnoreCase);

            foreach (var incomingTag in incomingTags.Where(t => !existingTagSet.Contains(t)))
            {
                tagRepository.Add(new RecipeTag
                {
                    RecipeId = recipeId,
                    Name = incomingTag,
                    CreatedOn = now
                });
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }

    private static IResult ValidationError(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });

    private static (List<string> Tags, string? ValidationError) NormalizeTags(List<string>? tags)
    {
        var normalizedTags = (tags ?? [])
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var tooLongTag = normalizedTags.FirstOrDefault(t => t.Length > MaxTagNameLength);
        return tooLongTag is null
            ? (normalizedTags, null)
            : ([], $"Tag '{tooLongTag}' exceeds maximum length of {MaxTagNameLength} characters.");
    }
}
