using Anything.Contracts.Renovation;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationRoomTemplatesQuery : IRequest<List<RenovationRoomTemplateResponse>>;

/// <summary>The household's effective templates: built-ins with the household's overrides, plus its own room types.</summary>
public class GetRenovationRoomTemplatesHandler(RenovationRepositories repos, IHouseholdContext householdContext)
    : IRequestHandler<GetRenovationRoomTemplatesQuery, List<RenovationRoomTemplateResponse>>
{
    public async Task<List<RenovationRoomTemplateResponse>> Handle(GetRenovationRoomTemplatesQuery query, CancellationToken ct = default) =>
        (await RenovationTemplateResolver.Resolve(repos, householdContext.HouseholdId, ct))
        .Select(RenovationRoomTemplates.ToResponse)
        .ToList();
}
