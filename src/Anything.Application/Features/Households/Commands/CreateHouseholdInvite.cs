using Anything.Contracts.Auth;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record CreateHouseholdInviteCommand(int HouseholdId, string Email, int RequestingUserId) : IRequest<IResult>;

public class CreateHouseholdInviteHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateHouseholdInviteCommand, IResult>
{
    public async Task<IResult> Handle(CreateHouseholdInviteCommand command, CancellationToken ct = default)
    {
        var householdExists = await householdRepository.Query()
            .Where(h => h.Id == command.HouseholdId && h.DeletedOn == null)
            .AnyAsync(ct);

        if (!householdExists)
            return Results.NotFound();

        var requestingMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.RequestingUserId)
            .FirstOrDefaultAsync(ct);

        if (requestingMember is null || requestingMember.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        var existingUser = await userRepository.Query()
            .Where(u => u.Email == command.Email)
            .AnyAsync(ct);

        if (existingUser)
            return Results.BadRequest("User with this email already exists.");

        var now = timeProvider.GetUtcNow();
        var token = Guid.NewGuid().ToString();
        var invite = new UserInvite
        {
            Email = command.Email,
            Token = token,
            ExpiresAt = now.AddDays(7).UtcDateTime,
            CreatedByUserId = command.RequestingUserId,
            CreatedOn = now.UtcDateTime,
            HouseholdId = command.HouseholdId
        };

        inviteRepository.Add(invite);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new CreateInviteResponse($"/register?token={token}", token));
    }
}
