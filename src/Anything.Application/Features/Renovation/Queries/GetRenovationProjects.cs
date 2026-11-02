using Anything.Contracts.Renovation;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationProjectsQuery : IRequest<List<RenovationProjectSummaryResponse>>;

public class GetRenovationProjectsHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext) : IRequestHandler<GetRenovationProjectsQuery, List<RenovationProjectSummaryResponse>>
{
    public async Task<List<RenovationProjectSummaryResponse>> Handle(GetRenovationProjectsQuery query, CancellationToken ct = default)
    {
        var projects = await RenovationProjectLoader.Load(repos, householdContext.HouseholdId, null, ct);
        return projects
            .Select(p => new RenovationProjectSummaryResponse(
                p.Id, p.Name, p.Budget, p.Rooms.Count, p.Estimate, p.Actual, p.Forecast, p.CreatedOn, p.ModifiedOn))
            .ToList();
    }
}
