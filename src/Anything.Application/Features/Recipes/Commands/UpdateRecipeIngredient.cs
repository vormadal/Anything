using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record UpdateRecipeIngredientCommand(int RecipeId, int IngredientId, string Name, decimal? Amount, string? Unit, string? Group) : IRequest<IResult>;

public class UpdateRecipeIngredientHandler(IRepository<Recipe> recipeRepository, IRepository<RecipeIngredient> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider, IUnitCatalog unitCatalog)
    : IRequestHandler<UpdateRecipeIngredientCommand, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string IngredientNotFound = "Ingredient not found.";

    public async Task<IResult> Handle(UpdateRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var recipeExists = await recipeRepository.Query()
            .AnyAsync(r => r.Id == command.RecipeId && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId, ct);
        if (!recipeExists)
            return Results.NotFound(RecipeNotFound);

        var ingredient = await repository.Query()
            .FirstOrDefaultAsync(i => i.Id == command.IngredientId && i.DeletedOn == null && i.RecipeId == command.RecipeId, ct);
        if (ingredient is null)
            return Results.NotFound(IngredientNotFound);

        ingredient.Name = command.Name;
        ingredient.Amount = command.Amount;
        ingredient.Unit = command.Unit;
        ingredient.Group = command.Group;
        ingredient.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitCatalog.EnsureUnit(command.Unit, ct);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
