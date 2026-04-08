using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeTagCommand(int RecipeId, int TagId) : IRequest<IResult>;

public class DeleteRecipeTagHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<RecipeTag> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRecipeTagCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string TagNotFound = "Tag not found.";

    public async Task<IResult> Handle(DeleteRecipeTagCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var tag = await repository.Query()
            .FirstOrDefaultAsync(t => t.Id == command.TagId && t.DeletedOn == null && t.RecipeId == command.RecipeId, ct);
        if (tag is null)
            return Results.NotFound(TagNotFound);

        tag.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
