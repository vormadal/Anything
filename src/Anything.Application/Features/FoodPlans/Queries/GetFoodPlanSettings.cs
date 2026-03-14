using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanSettingsQuery : IRequest<FoodPlanSettings>;

public class GetFoodPlanSettingsHandler(IRepository<FoodPlanSettings> repository)
    : IRequestHandler<GetFoodPlanSettingsQuery, FoodPlanSettings>
{
    public async Task<FoodPlanSettings> Handle(GetFoodPlanSettingsQuery query, CancellationToken ct = default)
    {
        var settings = await repository.Query().FirstOrDefaultAsync(ct);
        return settings ?? new FoodPlanSettings { ActiveDays = 31 };
    }
}
