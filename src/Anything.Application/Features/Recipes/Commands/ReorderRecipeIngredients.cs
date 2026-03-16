using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record ReorderRecipeIngredientsCommand(int RecipeId, List<int> Ids) : IRequest<IResult>;

public class ReorderRecipeIngredientsHandler(IRepository<RecipeIngredient> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<ReorderRecipeIngredientsCommand, IResult>
{
    public async Task<IResult> Handle(ReorderRecipeIngredientsCommand command, CancellationToken ct = default)
    {
        var ingredients = await repository.Query()
            .Where(i => i.RecipeId == command.RecipeId && i.DeletedOn == null && command.Ids.Contains(i.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var ingredient = ingredients.FirstOrDefault(x => x.Id == command.Ids[i]);
            if (ingredient != null)
            {
                ingredient.SortOrder = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
