using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Vendors.Queries;

public record GetVendorsQuery : IRequest<List<Vendor>>;

public class GetVendorsHandler(IRepository<Vendor> repository)
    : IRequestHandler<GetVendorsQuery, List<Vendor>>
{
    public async Task<List<Vendor>> Handle(GetVendorsQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(v => v.DeletedOn == null)
            .OrderBy(v => v.Name)
            .ToListAsync(ct);
    }
}
