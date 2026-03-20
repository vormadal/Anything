using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Vendors.Queries;

public record GetVendorByIdQuery(int Id) : IRequest<IResult>;

public class GetVendorByIdHandler(IRepository<Vendor> repository)
    : IRequestHandler<GetVendorByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetVendorByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is Vendor vendor && vendor.DeletedOn == null
            ? Results.Ok(vendor)
            : Results.NotFound();
    }
}
