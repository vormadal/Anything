using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Recipes.Commands;

public record ImportRecipeIngredient(string Name, decimal Amount, string? Unit, string? Group);

public record ImportRecipeStep(string Text, int Order);

public record ImportRecipeCommand(
    string Name,
    string? Link,
    string? Notes,
    IReadOnlyList<ImportRecipeIngredient> Ingredients,
    IReadOnlyList<ImportRecipeStep> Steps) : IRequest<Recipe>;

public class ImportRecipeHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<ImportRecipeCommand, Recipe>
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
            Amount = i.Amount < 0 ? 0 : i.Amount,
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
        await unitOfWork.SaveChanges(ct);

        return recipe;
    }
}
