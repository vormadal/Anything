using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.API.Authorization;

/// <summary>
/// The "is this user a member of this household" query — shared by
/// <see cref="Middleware.HouseholdMiddleware"/> (which runs it once per
/// request against the <c>X-Household-Id</c> header) and any endpoint that
/// needs the same check outside the middleware's normal activation (e.g.
/// minting an SSE ticket — see <c>EventsEndpoints</c> — where the household
/// comes from a header on the one-off ticket request, not the SSE connection
/// itself, which can't send custom headers at all).
/// </summary>
public static class HouseholdMembershipLookup
{
    public static Task<HouseholdMember?> FindMembership(
        IRepository<HouseholdMember> memberRepository,
        IRepository<Household> householdRepository,
        int householdId,
        int userId,
        CancellationToken ct) =>
        memberRepository.Query()
            .Join(
                householdRepository.Query().Where(h => h.DeletedOn == null),
                m => m.HouseholdId,
                h => h.Id,
                (m, h) => m)
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .FirstOrDefaultAsync(ct);
}
