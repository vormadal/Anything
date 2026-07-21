using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeTagByNameCommand(string Name) : IRequest<IResult>;

public class DeleteRecipeTagByNameHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> tagRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRecipeTagByNameCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRecipeTagByNameCommand command, CancellationToken ct = default)
    {
        var householdRecipeIds = recipeRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .Select(r => r.Id);

        var matchingTags = await tagRepository.Query()
            .Where(t => t.DeletedOn == null
                && householdRecipeIds.Contains(t.RecipeId)
                && t.Name.ToLower() == command.Name.ToLower())
            .ToListAsync(ct);

        if (matchingTags.Count == 0)
            return Results.NotFound(RecipeTagCatalogErrors.NotFound);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var tag in matchingTags)
        {
            tag.DeletedOn = now;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
