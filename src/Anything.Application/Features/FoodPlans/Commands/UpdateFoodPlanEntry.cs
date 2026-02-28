using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanEntryCommand(int FoodPlanId, int EntryId, int? RecipeId, string? CustomName, int DayOfWeek, string? MealType) : IRequest<IResult>;

public class UpdateFoodPlanEntryHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<UpdateFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string EntryNotFound = "Food plan entry not found.";
    private const string RecipeNotFound = "Recipe not found.";
    private const string EntryMissingName = "Either RecipeId or CustomName must be provided.";

    public async Task<IResult> Handle(UpdateFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        if (command.RecipeId is null && string.IsNullOrWhiteSpace(command.CustomName))
            return Results.BadRequest(EntryMissingName);

        var entry = await entryRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == command.EntryId && e.FoodPlanId == command.FoodPlanId && e.DeletedOn == null, ct);
        if (entry is null)
            return Results.NotFound(EntryNotFound);

        if (command.RecipeId.HasValue)
        {
            var recipe = await recipeRepository.GetById(command.RecipeId.Value);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);
        }

        entry.RecipeId = command.RecipeId;
        entry.CustomName = command.CustomName;
        entry.DayOfWeek = command.DayOfWeek;
        entry.MealType = command.MealType;
        entry.ModifiedOn = DateTime.UtcNow;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
