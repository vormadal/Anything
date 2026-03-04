using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeIngredientCommand(int RecipeId, int IngredientId) : IRequest<IResult>;

public class DeleteRecipeIngredientHandler(IRepository<RecipeIngredient> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteRecipeIngredientCommand, IResult>
{
    private const string IngredientNotFound = "Ingredient not found.";

    public async Task<IResult> Handle(DeleteRecipeIngredientCommand command, CancellationToken ct = default)
    {
        var ingredient = await repository.GetById(command.IngredientId);
        if (ingredient is null || ingredient.DeletedOn != null || ingredient.RecipeId != command.RecipeId)
            return Results.NotFound(IngredientNotFound);

        ingredient.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
