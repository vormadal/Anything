using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanEntriesQuery(int FoodPlanId) : IRequest<List<FoodPlanEntry>>;

public class GetFoodPlanEntriesHandler(IRepository<FoodPlanEntry> repository)
    : IRequestHandler<GetFoodPlanEntriesQuery, List<FoodPlanEntry>>
{
    public async Task<List<FoodPlanEntry>> Handle(GetFoodPlanEntriesQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(e => e.FoodPlanId == query.FoodPlanId && e.DeletedOn == null)
            .OrderBy(e => e.DayOfWeek)
            .ToListAsync(ct);
    }
}
