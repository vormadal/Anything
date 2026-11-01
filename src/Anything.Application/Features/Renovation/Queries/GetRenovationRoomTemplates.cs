using Anything.Contracts.Renovation;
using Anything.Mediator;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationRoomTemplatesQuery : IRequest<List<RenovationRoomTemplateResponse>>;

public class GetRenovationRoomTemplatesHandler
    : IRequestHandler<GetRenovationRoomTemplatesQuery, List<RenovationRoomTemplateResponse>>
{
    public Task<List<RenovationRoomTemplateResponse>> Handle(GetRenovationRoomTemplatesQuery query, CancellationToken ct = default) =>
        Task.FromResult(RenovationRoomTemplates.All.Select(RenovationRoomTemplates.ToResponse).ToList());
}
