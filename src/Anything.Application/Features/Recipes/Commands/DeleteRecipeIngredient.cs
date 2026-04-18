using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeIngredientCommand(int RecipeId, int IngredientId) : IRequest<IResult>;

public class DeleteRecipeIngredientHandler(IRepository<Recipe> recipeRepository, IRepository<RecipeIngredient> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteRecipeIngredientCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string IngredientNotFound = "Ingredient not found.";

    public async Task<IResult> Handle(DeleteRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var ingredient = await repository.Query()
            .FirstOrDefaultAsync(i => i.Id == command.IngredientId && i.DeletedOn == null && i.RecipeId == command.RecipeId, ct);
        if (ingredient is null)
            return Results.NotFound(IngredientNotFound);

        ingredient.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
