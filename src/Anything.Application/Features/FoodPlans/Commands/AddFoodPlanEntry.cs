using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanEntryCommand(string Name, int? RecipeId, DateTime Date, string? Comment = null) : IRequest<IResult>;

public class AddFoodPlanEntryHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddFoodPlanEntryCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        int? recipeId = command.RecipeId;
        if (recipeId.HasValue)
        {
            var recipe = await recipeRepository.GetById(recipeId.Value);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);
        }
        else
        {
            var newRecipe = new Recipe { Name = command.Name, CreatedOn = timeProvider.GetUtcNow().UtcDateTime };
            recipeRepository.Add(newRecipe);
            await unitOfWork.SaveChanges(ct);
            recipeId = newRecipe.Id;
        }

        var entry = new FoodPlanEntry
        {
            Name = command.Name,
            RecipeId = recipeId,
            Comment = command.Comment,
            Date = command.Date,
            DayOfWeek = ((int)command.Date.DayOfWeek + 6) % 7,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        entryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/food-plan/entries/{entry.Id}", entry);
    }
}
