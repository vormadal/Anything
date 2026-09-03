using Anything.Application.Common;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record CreateRecipeShareTokenCommand(
    int RecipeId,
    ShareExpiry Expiry,
    string? TargetEmail,
    int CreatedByUserId
) : IRequest<IResult>;

public class CreateRecipeShareTokenHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeShareToken> shareRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext) : IRequestHandler<CreateRecipeShareTokenCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(CreateRecipeShareTokenCommand command, CancellationToken ct = default)
    {
        var recipe = await recipeRepository.Query()
            .Where(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);

        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        DateTime? expiresAt = command.Expiry switch
        {
            ShareExpiry.OneWeek => now.AddDays(7),
            ShareExpiry.OneMonth => now.AddDays(30),
            _ => null
        };

        var share = new RecipeShareToken
        {
            RecipeId = command.RecipeId,
            Token = SecureTokenGenerator.GenerateHexToken(),
            TargetEmail = command.TargetEmail?.ToLowerInvariant(),
            ExpiresAt = expiresAt,
            CreatedOn = now,
            CreatedByUserId = command.CreatedByUserId
        };

        shareRepository.Add(share);
        await unitOfWork.SaveChanges(ct);

        return Results.Created(
            $"/api/recipes/{command.RecipeId}/shares/{share.Id}",
            ToResponse(share, now));
    }

    private static RecipeShareResponse ToResponse(RecipeShareToken share, DateTime now) =>
        new(
            share.Id,
            share.Token,
            $"/shared/recipe/{share.Token}",
            share.TargetEmail,
            share.ExpiresAt,
            share.CreatedOn,
            share.ExpiresAt.HasValue && share.ExpiresAt.Value < now,
            share.ClaimedOn.HasValue
        );
}
