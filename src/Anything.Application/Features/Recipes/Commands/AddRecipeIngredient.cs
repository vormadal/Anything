using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeIngredientCommand(int RecipeId, string Name, decimal? Amount, string? Unit, string? Group) : IRequest<IResult>;

public class AddRecipeIngredientHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRecipeIngredientCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var ingredient = new RecipeIngredient
        {
            RecipeId = command.RecipeId,
            Name = command.Name,
            Amount = command.Amount,
            Unit = command.Unit,
            Group = command.Group,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        ingredientRepository.Add(ingredient);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/recipes/{command.RecipeId}/ingredients/{ingredient.Id}", ingredient);
    }
}
