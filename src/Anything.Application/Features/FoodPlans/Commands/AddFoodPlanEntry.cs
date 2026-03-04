using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanEntryCommand(int FoodPlanId, string Name, int? RecipeId, int DayOfWeek) : IRequest<IResult>;

public class AddFoodPlanEntryHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

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
            FoodPlanId = command.FoodPlanId,
            Name = command.Name,
            RecipeId = recipeId,
            DayOfWeek = command.DayOfWeek,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        entryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/food-plans/{command.FoodPlanId}/entries/{entry.Id}", entry);
    }
}
