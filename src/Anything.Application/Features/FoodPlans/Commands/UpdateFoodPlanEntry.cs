using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanEntryCommand(int FoodPlanId, int EntryId, string Name, int? RecipeId, int DayOfWeek) : IRequest<IResult>;

public class UpdateFoodPlanEntryHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string EntryNotFound = "Food plan entry not found.";
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(UpdateFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

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

        entry.Name = command.Name;
        entry.RecipeId = command.RecipeId;
        entry.DayOfWeek = command.DayOfWeek;
        entry.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
