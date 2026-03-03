using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanCommand(int Id, string Name, DateTime WeekStart, int ActiveDays = 31) : IRequest<IResult>;

public class UpdateFoodPlanHandler(IRepository<FoodPlan> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<UpdateFoodPlanCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";

    public async Task<IResult> Handle(UpdateFoodPlanCommand command, CancellationToken ct = default)
    {
        var plan = await repository.GetById(command.Id);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        plan.Name = command.Name;
        plan.WeekStart = command.WeekStart;
        plan.ActiveDays = command.ActiveDays;
        plan.ModifiedOn = DateTime.UtcNow;
        repository.Update(plan);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
