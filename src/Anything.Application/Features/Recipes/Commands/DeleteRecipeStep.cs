using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeStepCommand(int RecipeId, int StepId) : IRequest<IResult>;

public class DeleteRecipeStepHandler(IRepository<RecipeStep> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteRecipeStepCommand, IResult>
{
    private const string StepNotFound = "Step not found.";

    public async Task<IResult> Handle(DeleteRecipeStepCommand command, CancellationToken ct = default)
    {
        var step = await repository.GetById(command.StepId);
        if (step is null || step.DeletedOn != null || step.RecipeId != command.RecipeId)
            return Results.NotFound(StepNotFound);

        step.DeletedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
