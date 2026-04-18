using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record UpdateRecipeCommand(int Id, string Name, string? Link, string? Notes, int? CookTimeMinutes, int? Servings, ServingsType ServingsType) : IRequest<IResult>;

public class UpdateRecipeHandler(IRepository<Recipe> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IHouseholdContext householdContext)
    : IRequestHandler<UpdateRecipeCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(UpdateRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = await repository.Query()
            .Where(r => r.Id == command.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        recipe.Name = command.Name;
        recipe.Link = command.Link;
        recipe.Notes = command.Notes;
        recipe.CookTimeMinutes = command.CookTimeMinutes;
        recipe.Servings = command.Servings;
        recipe.ServingsType = command.ServingsType;
        recipe.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
