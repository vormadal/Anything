using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanEntryCommand(int EntryId, string Name, int? RecipeId, DateTime Date) : IRequest<IResult>;

public class UpdateFoodPlanEntryHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanEntryCommand, IResult>
{
    private const string EntryNotFound = "Food plan entry not found.";
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(UpdateFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var entry = await entryRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == command.EntryId && e.DeletedOn == null, ct);
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
        entry.Date = command.Date;
        entry.DayOfWeek = ((int)command.Date.DayOfWeek + 6) % 7;
        entry.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
