using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Somethings.Queries;

public record GetSomethingByIdQuery(int Id) : IRequest<IResult>;

public class GetSomethingByIdHandler(IRepository<Something> repository)
    : IRequestHandler<GetSomethingByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetSomethingByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is Something something && something.DeletedOn == null
            ? Results.Ok(something)
            : Results.NotFound();
    }
}
