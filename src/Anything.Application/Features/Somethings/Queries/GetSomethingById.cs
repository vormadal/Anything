using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Somethings.Queries;

public record GetSomethingByIdQuery(int Id) : IRequest<IResult>;

public class GetSomethingByIdHandler(IRepository<Something> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetSomethingByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetSomethingByIdQuery query, CancellationToken ct = default)
    {
        var something = await repository.Query().AsNoTracking()
            .Where(s => s.Id == query.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return something is not null ? Results.Ok(something) : Results.NotFound();
    }
}
