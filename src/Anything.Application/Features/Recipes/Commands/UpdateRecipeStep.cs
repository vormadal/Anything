using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record UpdateRecipeStepCommand(int RecipeId, int StepId, string Text, int Order) : IRequest<IResult>;

public class UpdateRecipeStepHandler(IRepository<RecipeStep> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateRecipeStepCommand, IResult>
{
    private const string StepNotFound = "Step not found.";

    public async Task<IResult> Handle(UpdateRecipeStepCommand command, CancellationToken ct = default)
    {
        var step = await repository.GetById(command.StepId);
        if (step is null || step.DeletedOn != null || step.RecipeId != command.RecipeId)
            return Results.NotFound(StepNotFound);

        step.Text = command.Text;
        step.Order = command.Order;
        step.ModifiedOn = DateTime.UtcNow;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
