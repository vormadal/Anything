using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Locations.Queries;

public record GetLocationsQuery : IRequest<List<Location>>;

public class GetLocationsHandler(IRepository<Location> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetLocationsQuery, List<Location>>
{
    public async Task<List<Location>> Handle(GetLocationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query().AsNoTracking()
            .Where(l => l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);
    }
}
