using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeStepsQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeStepsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeStep> stepRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetRecipeStepsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeStepsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query().AsNoTracking()
            .Where(r => r.Id == query.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var steps = await stepRepository.Query().AsNoTracking()
            .Where(s => s.RecipeId == query.RecipeId && s.DeletedOn == null)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);
        return Results.Ok(steps);
    }
}
