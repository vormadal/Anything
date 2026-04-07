using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Somethings.Queries;

public record GetSomethingsQuery : IRequest<List<Something>>;

public class GetSomethingsHandler(IRepository<Something> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetSomethingsQuery, List<Something>>
{
    public async Task<List<Something>> Handle(GetSomethingsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(s => s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);
    }
}
