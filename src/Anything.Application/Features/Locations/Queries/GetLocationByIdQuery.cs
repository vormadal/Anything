using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Locations.Queries;

public record GetLocationByIdQuery(int Id) : IRequest<IResult>;

public class GetLocationByIdHandler(IRepository<Location> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetLocationByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetLocationByIdQuery query, CancellationToken ct = default)
    {
        var location = await repository.Query().AsNoTracking()
            .Where(l => l.Id == query.Id && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return location is not null ? Results.Ok(location) : Results.NotFound();
    }
}
