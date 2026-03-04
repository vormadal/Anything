using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record UpdateRecipeIngredientCommand(int RecipeId, int IngredientId, string Name, decimal? Amount, string? Unit, string? Group) : IRequest<IResult>;

public class UpdateRecipeIngredientHandler(IRepository<RecipeIngredient> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateRecipeIngredientCommand, IResult>
{
    private const string IngredientNotFound = "Ingredient not found.";

    public async Task<IResult> Handle(UpdateRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var ingredient = await repository.GetById(command.IngredientId);
        if (ingredient is null || ingredient.DeletedOn != null || ingredient.RecipeId != command.RecipeId)
            return Results.NotFound(IngredientNotFound);

        ingredient.Name = command.Name;
        ingredient.Amount = command.Amount;
        ingredient.Unit = command.Unit;
        ingredient.Group = command.Group;
        ingredient.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
