using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanEntryCommand(int EntryId, string Name, int? RecipeId, DateTime Date) : IRequest<IResult>;

public class UpdateFoodPlanEntryHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanEntryCommand, IResult>
{
    private const string EntryNotFound = "Food plan entry not found.";
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(UpdateFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var entry = await entryRepository.Query()
            .Where(e => e.Id == command.EntryId && e.DeletedOn == null && e.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (entry is null)
            return Results.NotFound(EntryNotFound);

        if (command.RecipeId.HasValue)
        {
            var recipe = await recipeRepository.Query()
                .Where(r => r.Id == command.RecipeId.Value && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
                .FirstOrDefaultAsync(ct);
            if (recipe is null)
                return Results.NotFound(RecipeNotFound);
        }

        entry.Name = command.Name;
        entry.RecipeId = command.RecipeId;
        entry.Date = command.Date;
        entry.DayOfWeek = ((int)command.Date.DayOfWeek + 6) % 7;
        entry.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
