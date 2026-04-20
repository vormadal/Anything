using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeStepCommand(int RecipeId, int StepId) : IRequest<IResult>;

public class DeleteRecipeStepHandler(IRepository<Recipe> recipeRepository, IRepository<RecipeStep> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteRecipeStepCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string StepNotFound = "Step not found.";

    public async Task<IResult> Handle(DeleteRecipeStepCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var step = await repository.Query()
            .FirstOrDefaultAsync(s => s.Id == command.StepId && s.DeletedOn == null && s.RecipeId == command.RecipeId, ct);
        if (step is null)
            return Results.NotFound(StepNotFound);

        step.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
