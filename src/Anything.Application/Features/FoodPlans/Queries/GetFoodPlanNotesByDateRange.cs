using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanNotesByDateRangeQuery(DateOnly StartDate, DateOnly EndDate) : IRequest<List<FoodPlanNote>>;

public class GetFoodPlanNotesByDateRangeHandler(
    IRepository<FoodPlanNote> noteRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetFoodPlanNotesByDateRangeQuery, List<FoodPlanNote>>
{
    public async Task<List<FoodPlanNote>> Handle(GetFoodPlanNotesByDateRangeQuery query, CancellationToken ct = default)
    {
        return await noteRepository.Query().AsNoTracking()
            .Where(n => n.HouseholdId == householdContext.HouseholdId && n.Date >= query.StartDate && n.Date <= query.EndDate)
            .OrderBy(n => n.Date)
            .ToListAsync(ct);
    }
}
