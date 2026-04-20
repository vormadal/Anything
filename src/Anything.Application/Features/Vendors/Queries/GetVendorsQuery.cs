using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Vendors.Queries;

public record GetVendorsQuery : IRequest<List<Vendor>>;

public class GetVendorsHandler(IRepository<Vendor> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetVendorsQuery, List<Vendor>>
{
    public async Task<List<Vendor>> Handle(GetVendorsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(v => v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId)
            .OrderBy(v => v.Name)
            .ToListAsync(ct);
    }
}
