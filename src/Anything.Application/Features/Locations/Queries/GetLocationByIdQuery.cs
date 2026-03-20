using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Locations.Queries;

public record GetLocationByIdQuery(int Id) : IRequest<IResult>;

public class GetLocationByIdHandler(IRepository<Location> repository)
    : IRequestHandler<GetLocationByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetLocationByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is Location location && location.DeletedOn == null
            ? Results.Ok(location)
            : Results.NotFound();
    }
}
