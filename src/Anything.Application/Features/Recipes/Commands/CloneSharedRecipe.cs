using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record CloneSharedRecipeCommand(
    string Token,
    int TargetHouseholdId,
    int UserId,
    string UserEmail
) : IRequest<IResult>;

public class CloneSharedRecipeHandler(
    IRepository<RecipeShareToken> shareRepository,
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeIngredient> ingredientRepository,
    IRepository<RecipeStep> stepRepository,
    IRepository<RecipeTag> tagRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CloneSharedRecipeCommand, IResult>
{
    private const string TokenNotFound = "Share link not found or has expired.";
    private const string NotAuthorized = "This share link is intended for a different user.";
    private const string NotMember = "You are not a member of the target household.";

    public async Task<IResult> Handle(CloneSharedRecipeCommand command, CancellationToken ct = default)
    {
        var share = await shareRepository.Query()
            .Where(s => s.Token == command.Token)
            .FirstOrDefaultAsync(ct);

        if (share is null)
            return Results.NotFound(TokenNotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (share.ExpiresAt.HasValue && share.ExpiresAt.Value < now)
            return Results.Problem("This share link has expired.", statusCode: StatusCodes.Status410Gone);

        if (share.TargetEmail is not null &&
            !share.TargetEmail.Equals(command.UserEmail, StringComparison.OrdinalIgnoreCase))
            return Results.Forbid();

        var isMember = await memberRepository.Query()
            .AnyAsync(m => m.HouseholdId == command.TargetHouseholdId && m.UserId == command.UserId, ct);

        if (!isMember)
            return Results.Forbid();

        var source = await recipeRepository.Query()
            .Where(r => r.Id == share.RecipeId && r.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (source is null)
            return Results.NotFound(TokenNotFound);

        var clone = new Recipe
        {
            HouseholdId = command.TargetHouseholdId,
            Name = source.Name,
            Link = source.Link,
            Notes = source.Notes,
            CookTimeMinutes = source.CookTimeMinutes,
            Servings = source.Servings,
            ServingsType = source.ServingsType,
            CreatedOn = now
        };
        recipeRepository.Add(clone);
        await unitOfWork.SaveChanges(ct);

        var ingredients = await ingredientRepository.Query()
            .Where(i => i.RecipeId == share.RecipeId && i.DeletedOn == null)
            .OrderBy(i => i.SortOrder)
            .ToListAsync(ct);

        ingredientRepository.AddRange(ingredients.Select(i => new RecipeIngredient
        {
            RecipeId = clone.Id,
            Name = i.Name,
            Amount = i.Amount,
            Unit = i.Unit,
            Group = i.Group,
            SortOrder = i.SortOrder,
            CreatedOn = now
        }));

        var steps = await stepRepository.Query()
            .Where(s => s.RecipeId == share.RecipeId && s.DeletedOn == null)
            .OrderBy(s => s.Order)
            .ToListAsync(ct);

        stepRepository.AddRange(steps.Select(s => new RecipeStep
        {
            RecipeId = clone.Id,
            Text = s.Text,
            Order = s.Order,
            CreatedOn = now
        }));

        var tags = await tagRepository.Query()
            .Where(t => t.RecipeId == share.RecipeId && t.DeletedOn == null)
            .ToListAsync(ct);

        tagRepository.AddRange(tags.Select(t => new RecipeTag
        {
            RecipeId = clone.Id,
            Name = t.Name,
            CreatedOn = now
        }));

        if (share.TargetEmail is not null)
        {
            share.ClaimedOn = now;
            shareRepository.Update(share);
        }

        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/recipes/{clone.Id}", clone);
    }
}
