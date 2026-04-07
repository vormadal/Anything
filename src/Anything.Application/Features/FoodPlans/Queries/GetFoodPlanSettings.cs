using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanSettingsQuery : IRequest<FoodPlanSettings>;

public class GetFoodPlanSettingsHandler(IRepository<FoodPlanSettings> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetFoodPlanSettingsQuery, FoodPlanSettings>
{
    public async Task<FoodPlanSettings> Handle(GetFoodPlanSettingsQuery query, CancellationToken ct = default)
    {
        var settings = await repository.Query()
            .Where(s => s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return settings ?? new FoodPlanSettings { HouseholdId = householdContext.HouseholdId, ActiveDays = 31 };
    }
}
