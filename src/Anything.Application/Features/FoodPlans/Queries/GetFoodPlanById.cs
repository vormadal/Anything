using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanByIdQuery(int Id) : IRequest<IResult>;

public class GetFoodPlanByIdHandler(IRepository<FoodPlan> repository)
    : IRequestHandler<GetFoodPlanByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetFoodPlanByIdQuery query, CancellationToken ct = default)
    {
        var plan = await repository.GetById(query.Id);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound("Food plan not found.");

        return Results.Ok(plan);
    }
}
