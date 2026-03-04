using Anything.Contracts.Auth;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record GetInvitesQuery(int UserId, string UserRole) : IRequest<IResult>;

public class GetInvitesHandler(
    IRepository<UserInvite> inviteRepository,
    TimeProvider timeProvider) : IRequestHandler<GetInvitesQuery, IResult>
{
    public async Task<IResult> Handle(GetInvitesQuery query, CancellationToken ct = default)
    {
        if (query.UserRole != Core.Constants.UserRoles.Admin)
            return Results.Forbid();

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var invites = await inviteRepository.Query()
            .OrderByDescending(i => i.CreatedOn)
            .Select(i => new InviteResponse(
                i.Id,
                i.Email,
                i.ExpiresAt,
                i.CreatedOn,
                i.IsUsed,
                i.ExpiresAt < now))
            .ToListAsync(ct);

        return Results.Ok(invites);
    }
}
