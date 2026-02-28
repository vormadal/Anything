using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.FoodPlans.Commands;

public record CreateFoodPlanCommand(string Name, DateTime WeekStart) : IRequest<FoodPlan>;

public class CreateFoodPlanHandler(IRepository<FoodPlan> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<CreateFoodPlanCommand, FoodPlan>
{
    public async Task<FoodPlan> Handle(CreateFoodPlanCommand command, CancellationToken ct = default)
    {
        var plan = new FoodPlan
        {
            Name = command.Name,
            WeekStart = command.WeekStart
        };
        repository.Add(plan);
        await unitOfWork.SaveChanges(ct);
        return plan;
    }
}
