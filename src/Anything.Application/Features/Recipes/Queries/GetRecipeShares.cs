using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeSharesQuery(int RecipeId) : IRequest<IResult>;

public class GetRecipeSharesHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeShareToken> shareRepository,
    TimeProvider timeProvider,
    IHouseholdContext householdContext) : IRequestHandler<GetRecipeSharesQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeSharesQuery query, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == query.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);

        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        var shares = await shareRepository.Query()
            .Where(s => s.RecipeId == query.RecipeId)
            .OrderByDescending(s => s.CreatedOn)
            .Select(s => new RecipeShareResponse(
                s.Id,
                s.Token,
                $"/shared/recipe/{s.Token}",
                s.TargetEmail,
                s.ExpiresAt,
                s.CreatedOn,
                s.ExpiresAt != null && s.ExpiresAt.Value < now,
                s.ClaimedOn != null
            ))
            .ToListAsync(ct);

        return Results.Ok(shares);
    }
}
