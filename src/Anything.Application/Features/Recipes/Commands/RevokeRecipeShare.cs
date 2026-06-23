using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record RevokeRecipeShareCommand(int RecipeId, int TokenId) : IRequest<IResult>;

public class RevokeRecipeShareHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeShareToken> shareRepository,
    IUnitOfWork unitOfWork,
    IHouseholdContext householdContext) : IRequestHandler<RevokeRecipeShareCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string ShareNotFound = "Share token not found.";

    public async Task<IResult> Handle(RevokeRecipeShareCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);

        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var share = await shareRepository.Query()
            .Where(s => s.Id == command.TokenId && s.RecipeId == command.RecipeId)
            .FirstOrDefaultAsync(ct);

        if (share is null)
            return Results.NotFound(ShareNotFound);

        shareRepository.Remove(share);
        await unitOfWork.SaveChanges(ct);

        return Results.NoContent();
    }
}
