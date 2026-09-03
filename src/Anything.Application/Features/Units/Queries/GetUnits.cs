using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Queries;

public record GetUnitsQuery : IRequest<List<MeasurementUnit>>;

public class GetUnitsHandler(IRepository<MeasurementUnit> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetUnitsQuery, List<MeasurementUnit>>
{
    public async Task<List<MeasurementUnit>> Handle(GetUnitsQuery query, CancellationToken ct = default)
    {
        return await repository.Query().AsNoTracking()
            .Where(u => u.HouseholdId == householdContext.HouseholdId)
            .OrderBy(u => u.Name)
            .ToListAsync(ct);
    }
}
