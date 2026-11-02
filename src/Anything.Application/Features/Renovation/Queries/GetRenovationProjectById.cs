using Anything.Contracts.Renovation;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationProjectByIdQuery(int Id) : IRequest<IResult>;

public class GetRenovationProjectByIdHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext) : IRequestHandler<GetRenovationProjectByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetRenovationProjectByIdQuery query, CancellationToken ct = default)
    {
        var projects = await RenovationProjectLoader.Load(repos, householdContext.HouseholdId, query.Id, ct);
        return projects.Count == 0 ? Results.NotFound() : Results.Ok(projects[0]);
    }
}
