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
    IUnitOfWork unitOfWork) : IRequestHandler<AddFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(AddFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        if (command.RecipeId.HasValue)
        {
            var recipe = await recipeRepository.GetById(command.RecipeId.Value);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);
        }

        var entry = new FoodPlanEntry
        {
            FoodPlanId = command.FoodPlanId,
            Name = command.Name,
            RecipeId = command.RecipeId,
            DayOfWeek = command.DayOfWeek
        };
        entryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/food-plans/{command.FoodPlanId}/entries/{entry.Id}", entry);
    }
}
