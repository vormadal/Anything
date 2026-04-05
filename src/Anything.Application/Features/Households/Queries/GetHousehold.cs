using Anything.Contracts.Households;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Queries;

public record GetHouseholdQuery(int Id, int UserId) : IRequest<IResult>;

public class GetHouseholdHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IRepository<User> userRepository) : IRequestHandler<GetHouseholdQuery, IResult>
{
    public async Task<IResult> Handle(GetHouseholdQuery query, CancellationToken ct = default)
    {
        var household = await householdRepository.Query()
            .Where(h => h.Id == query.Id && h.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (household is null)
            return Results.NotFound();

        var isMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == query.Id && m.UserId == query.UserId)
            .AnyAsync(ct);

        if (!isMember)
            return Results.Forbid();

        var members = await memberRepository.Query()
            .Where(m => m.HouseholdId == query.Id)
            .Join(
                userRepository.Query().Where(u => u.DeletedOn == null),
                m => m.UserId,
                u => u.Id,
                (m, u) => new HouseholdMemberResponse(u.Id, u.Name, u.Email, m.Role, m.JoinedOn))
            .ToListAsync(ct);

        return Results.Ok(new HouseholdDetailResponse(household.Id, household.Name, household.CreatedOn, members));
    }
}
