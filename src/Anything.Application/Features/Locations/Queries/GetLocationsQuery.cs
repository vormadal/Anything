using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Locations.Queries;

public record GetLocationsQuery : IRequest<List<Location>>;

public class GetLocationsHandler(IRepository<Location> repository)
    : IRequestHandler<GetLocationsQuery, List<Location>>
{
    public async Task<List<Location>> Handle(GetLocationsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(l => l.DeletedOn == null)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);
    }
}
