using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlansQuery : IRequest<List<FoodPlan>>;

public class GetFoodPlansHandler(IRepository<FoodPlan> repository)
    : IRequestHandler<GetFoodPlansQuery, List<FoodPlan>>
{
    public async Task<List<FoodPlan>> Handle(GetFoodPlansQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(p => p.DeletedOn == null)
            .OrderByDescending(p => p.WeekStart)
            .ToListAsync(ct);
    }
}
