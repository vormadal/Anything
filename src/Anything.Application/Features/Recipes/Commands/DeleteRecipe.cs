using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeCommand(int Id) : IRequest<IResult>;

public class DeleteRecipeHandler(IRepository<Recipe> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IHouseholdContext householdContext)
    : IRequestHandler<DeleteRecipeCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(DeleteRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = await repository.Query()
            .Where(r => r.Id == command.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recipe is null)
            return Results.NotFound(RecipeNotFound);

        recipe.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
