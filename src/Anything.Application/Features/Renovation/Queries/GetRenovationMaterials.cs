using Anything.Contracts.Renovation;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationMaterialsQuery : IRequest<List<RenovationMaterialResponse>>;

public class GetRenovationMaterialsHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext) : IRequestHandler<GetRenovationMaterialsQuery, List<RenovationMaterialResponse>>
{
    public async Task<List<RenovationMaterialResponse>> Handle(GetRenovationMaterialsQuery query, CancellationToken ct = default)
    {
        var materials = await repos.Materials.Query().AsNoTracking()
            .Where(m => m.HouseholdId == householdContext.HouseholdId && m.DeletedOn == null)
            .OrderBy(m => m.Category).ThenBy(m => m.Name)
            .ToListAsync(ct);
        return materials.Select(RenovationMapping.ToResponse).ToList();
    }
}
