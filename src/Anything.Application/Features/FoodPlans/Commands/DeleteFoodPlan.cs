using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record DeleteFoodPlanCommand(int Id) : IRequest<IResult>;

public class DeleteFoodPlanHandler(IRepository<FoodPlan> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteFoodPlanCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";

    public async Task<IResult> Handle(DeleteFoodPlanCommand command, CancellationToken ct = default)
    {
        var plan = await repository.GetById(command.Id);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        plan.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        repository.Update(plan);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
