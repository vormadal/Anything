using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Vendors.Queries;

public record GetVendorByIdQuery(int Id) : IRequest<IResult>;

public class GetVendorByIdHandler(IRepository<Vendor> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetVendorByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetVendorByIdQuery query, CancellationToken ct = default)
    {
        var vendor = await repository.Query().AsNoTracking()
            .Where(v => v.Id == query.Id && v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return vendor is not null ? Results.Ok(vendor) : Results.NotFound();
    }
}
