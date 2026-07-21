using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record RenameRecipeTagCommand(string OldName, string NewName) : IRequest<IResult>;

public class RenameRecipeTagHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<RenameRecipeTagCommand, IResult>
{
    public async Task<IResult> Handle(RenameRecipeTagCommand command, CancellationToken ct = default)
    {
        var householdRecipeIds = recipeRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .Select(r => r.Id);

        var matchingTags = await tagRepository.Query()
            .Where(t => t.DeletedOn == null
                && householdRecipeIds.Contains(t.RecipeId)
                && t.Name.ToLower() == command.OldName.ToLower())
            .ToListAsync(ct);

        if (matchingTags.Count == 0)
            return Results.NotFound(RecipeTagCatalogErrors.NotFound);

        var affectedRecipeIds = matchingTags.Select(t => t.RecipeId).ToHashSet();
        var recipeIdsWithNewName = await tagRepository.Query()
            .Where(t => t.DeletedOn == null
                && affectedRecipeIds.Contains(t.RecipeId)
                && t.Name.ToLower() == command.NewName.ToLower())
            .Select(t => t.RecipeId)
            .ToListAsync(ct);
        var collidingRecipeIds = recipeIdsWithNewName.ToHashSet();

        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var tag in matchingTags)
        {
            if (collidingRecipeIds.Contains(tag.RecipeId))
            {
                // The recipe already has a tag with the new name — merge by
                // dropping the old one instead of creating a duplicate.
                tag.DeletedOn = now;
            }
            else
            {
                tag.Name = command.NewName;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
