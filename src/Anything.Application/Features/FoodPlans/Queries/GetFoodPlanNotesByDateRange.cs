using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetFoodPlanNotesByDateRangeQuery(DateTime StartDate, DateTime EndDate) : IRequest<List<FoodPlanNote>>;

public class GetFoodPlanNotesByDateRangeHandler(
    IRepository<FoodPlanNote> noteRepository) : IRequestHandler<GetFoodPlanNotesByDateRangeQuery, List<FoodPlanNote>>
{
    public async Task<List<FoodPlanNote>> Handle(GetFoodPlanNotesByDateRangeQuery query, CancellationToken ct = default)
    {
        return await noteRepository.Query()
            .Where(n => n.Date >= query.StartDate && n.Date <= query.EndDate)
            .OrderBy(n => n.Date)
            .ToListAsync(ct);
    }
}
