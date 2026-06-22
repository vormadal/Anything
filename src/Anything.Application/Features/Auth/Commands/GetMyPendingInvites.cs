using Anything.Contracts.Auth;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record GetMyPendingInvitesQuery(int UserId) : IRequest<IResult>;

public class GetMyPendingInvitesHandler(
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IRepository<Household> householdRepository,
    TimeProvider timeProvider) : IRequestHandler<GetMyPendingInvitesQuery, IResult>
{
    public async Task<IResult> Handle(GetMyPendingInvitesQuery query, CancellationToken ct = default)
    {
        var userEmail = await userRepository.Query()
            .Where(u => u.Id == query.UserId && u.DeletedOn == null)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);

        if (userEmail == null)
            return Results.Unauthorized();

        var now = timeProvider.GetUtcNow().UtcDateTime;

        var invites = await inviteRepository.Query()
            .Where(i => i.Email == userEmail && !i.IsUsed && i.ExpiresAt > now)
            .ToListAsync(ct);

        var householdIds = invites
            .Where(i => i.HouseholdId.HasValue)
            .Select(i => i.HouseholdId!.Value)
            .Distinct()
            .ToList();

        var householdNames = await householdRepository.Query()
            .Where(h => householdIds.Contains(h.Id) && h.DeletedOn == null)
            .ToDictionaryAsync(h => h.Id, h => h.Name, ct);

        var result = invites.Select(i => new PendingInviteResponse(
            i.Id,
            i.Token,
            i.Email,
            i.HouseholdId,
            i.HouseholdId.HasValue ? householdNames.GetValueOrDefault(i.HouseholdId.Value) : null,
            i.ExpiresAt,
            $"/register?token={i.Token}"
        )).ToList();

        return Results.Ok(result);
    }
}
