using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanEntriesByDateRangeQuery(DateTime StartDate, DateTime EndDate) : IRequest<List<FoodPlanEntry>>;

public class GetFoodPlanEntriesByDateRangeHandler(IRepository<FoodPlanEntry> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetFoodPlanEntriesByDateRangeQuery, List<FoodPlanEntry>>
{
    public async Task<List<FoodPlanEntry>> Handle(GetFoodPlanEntriesByDateRangeQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(e => e.DeletedOn == null && e.HouseholdId == householdContext.HouseholdId && e.Date >= query.StartDate && e.Date <= query.EndDate)
            .OrderBy(e => e.Date)
            .ToListAsync(ct);
    }
}
