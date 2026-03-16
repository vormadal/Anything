using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Commands;

public record ReorderRecipeStepsCommand(int RecipeId, List<int> Ids) : IRequest<IResult>;

public class ReorderRecipeStepsHandler(IRepository<RecipeStep> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<ReorderRecipeStepsCommand, IResult>
{
    public async Task<IResult> Handle(ReorderRecipeStepsCommand command, CancellationToken ct = default)
    {
        var steps = await repository.Query()
            .Where(s => s.RecipeId == command.RecipeId && s.DeletedOn == null && command.Ids.Contains(s.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var step = steps.FirstOrDefault(s => s.Id == command.Ids[i]);
            if (step != null)
            {
                step.Order = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
