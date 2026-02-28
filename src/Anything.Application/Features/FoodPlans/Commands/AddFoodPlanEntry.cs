using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record AddFoodPlanEntryCommand(int FoodPlanId, int? RecipeId, string? CustomName, int DayOfWeek, string? MealType) : IRequest<IResult>;

public class AddFoodPlanEntryHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<AddFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string RecipeNotFound = "Recipe not found.";
    private const string EntryMissingName = "Either RecipeId or CustomName must be provided.";

    public async Task<IResult> Handle(AddFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        if (command.RecipeId is null && string.IsNullOrWhiteSpace(command.CustomName))
            return Results.BadRequest(EntryMissingName);

        if (command.RecipeId.HasValue)
        {
            var recipe = await recipeRepository.GetById(command.RecipeId.Value);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);
        }

        var entry = new FoodPlanEntry
        {
            FoodPlanId = command.FoodPlanId,
            RecipeId = command.RecipeId,
            CustomName = command.CustomName,
            DayOfWeek = command.DayOfWeek,
            MealType = command.MealType
        };
        entryRepository.Add(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/food-plans/{command.FoodPlanId}/entries/{entry.Id}", entry);
    }
}
