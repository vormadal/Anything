using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record AcceptHouseholdInviteCommand(string Token, int UserId) : IRequest<IResult>;

public class AcceptHouseholdInviteHandler(
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AcceptHouseholdInviteCommand, IResult>
{
    private const string InviteField = "invite";

    public async Task<IResult> Handle(AcceptHouseholdInviteCommand command, CancellationToken ct = default)
    {
        var invite = await inviteRepository.Query()
            .Where(i => i.Token == command.Token)
            .FirstOrDefaultAsync(ct);

        if (invite == null)
            return Results.NotFound();

        if (invite.IsUsed)
            return ValidationError("This invite has already been used.");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (invite.ExpiresAt < now)
            return ValidationError("This invite has expired.");

        if (!invite.HouseholdId.HasValue)
            return ValidationError("This invite is not for a household.");

        var user = await userRepository.Query()
            .Where(u => u.Id == command.UserId && u.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (user == null)
            return Results.Unauthorized();

        if (!string.Equals(user.Email, invite.Email, StringComparison.OrdinalIgnoreCase))
            return Results.Forbid();

        var existingMembership = await memberRepository.Query()
            .Where(m => m.HouseholdId == invite.HouseholdId && m.UserId == command.UserId)
            .AnyAsync(ct);

        if (existingMembership)
            return ValidationError("You are already a member of this household.");

        var member = new HouseholdMember
        {
            HouseholdId = invite.HouseholdId.Value,
            UserId = command.UserId,
            Role = HouseholdRoles.Member,
            JoinedOn = now
        };
        memberRepository.Add(member);
        invite.IsUsed = true;
        await unitOfWork.SaveChanges(ct);

        return Results.Ok();
    }

    private static IResult ValidationError(string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [InviteField] = [message] });
}
