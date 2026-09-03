using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeTagsQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeTagsHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetRecipeTagsQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeTagsQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query().AsNoTracking()
            .Where(r => r.Id == query.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var tags = await tagRepository.Query().AsNoTracking()
            .Where(t => t.RecipeId == query.RecipeId && t.DeletedOn == null)
            .ToListAsync(ct);
        return Results.Ok(tags);
    }
}
