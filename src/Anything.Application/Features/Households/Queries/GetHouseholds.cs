using Anything.Contracts.Households;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Queries;

public record GetHouseholdsQuery(int UserId) : IRequest<List<HouseholdResponse>>;

public class GetHouseholdsHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository) : IRequestHandler<GetHouseholdsQuery, List<HouseholdResponse>>
{
    public async Task<List<HouseholdResponse>> Handle(GetHouseholdsQuery query, CancellationToken ct = default)
    {
        return await memberRepository.Query().AsNoTracking()
            .Where(m => m.UserId == query.UserId)
            .Join(
                householdRepository.Query().AsNoTracking().Where(h => h.DeletedOn == null),
                m => m.HouseholdId,
                h => h.Id,
                (m, h) => new HouseholdResponse(h.Id, h.Name, h.CreatedOn, m.Role))
            .ToListAsync(ct);
    }
}
