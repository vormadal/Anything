using Anything.Contracts.Auth;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record CreateInviteCommand(string Email, int UserId, string UserRole, int? HouseholdId = null) : IRequest<IResult>;

public class CreateInviteHandler(
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IRepository<HouseholdMember> memberRepository,
    IRepository<Household> householdRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateInviteCommand, IResult>
{
    public async Task<IResult> Handle(CreateInviteCommand command, CancellationToken ct = default)
    {
        if (command.HouseholdId.HasValue)
        {
            var householdExists = await householdRepository.Query()
                .Where(h => h.Id == command.HouseholdId && h.DeletedOn == null)
                .AnyAsync(ct);

            if (!householdExists)
                return Results.NotFound();

            var requestingMember = await memberRepository.Query()
                .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.UserId)
                .FirstOrDefaultAsync(ct);

            var isAuthorized = command.UserRole == UserRoles.Admin
                ? requestingMember is not null
                : requestingMember?.Role == HouseholdRoles.Owner;

            if (!isAuthorized)
                return Results.Forbid();
        }
        else if (command.UserRole != UserRoles.Admin)
        {
            return Results.Forbid();
        }

        var existingUser = await userRepository.Query()
            .Where(u => u.Email == command.Email)
            .AnyAsync(ct);

        if (existingUser && !command.HouseholdId.HasValue)
            return Results.BadRequest("User with this email already exists.");

        var now = timeProvider.GetUtcNow();
        var token = Guid.NewGuid().ToString();
        var invite = new UserInvite
        {
            Email = command.Email,
            Token = token,
            ExpiresAt = now.AddDays(7).UtcDateTime,
            CreatedByUserId = command.UserId,
            CreatedOn = now.UtcDateTime,
            HouseholdId = command.HouseholdId
        };

        inviteRepository.Add(invite);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new CreateInviteResponse($"/register?token={token}", token));
    }
}
