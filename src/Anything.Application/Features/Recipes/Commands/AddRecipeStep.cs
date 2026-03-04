using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record AddRecipeStepCommand(int RecipeId, string Text, int Order) : IRequest<IResult>;

public class AddRecipeStepHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeStep> stepRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddRecipeStepCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddRecipeStepCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.GetById(command.RecipeId);
        if (recipe is null || recipe.DeletedOn != null)
            return Results.NotFound(RecipeNotFound);

        var step = new RecipeStep
        {
            RecipeId = command.RecipeId,
            Text = command.Text,
            Order = command.Order,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        stepRepository.Add(step);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/recipes/{command.RecipeId}/steps/{step.Id}", step);
    }
}
