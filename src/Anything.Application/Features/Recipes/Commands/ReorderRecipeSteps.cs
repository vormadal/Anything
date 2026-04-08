using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record ReorderRecipeStepsCommand(int RecipeId, List<int> Ids) : IRequest<IResult>;

public class ReorderRecipeStepsHandler(IRepository<Recipe> recipeRepository, IRepository<RecipeStep> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork)
    : IRequestHandler<ReorderRecipeStepsCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(ReorderRecipeStepsCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var steps = await repository.Query()
            .Where(s => s.RecipeId == command.RecipeId && s.DeletedOn == null && command.Ids.Contains(s.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var step = steps.FirstOrDefault(s => s.Id == command.Ids[i]);
            if (step != null)
            {
                step.Order = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
