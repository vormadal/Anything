using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record AddHouseholdMemberCommand(int HouseholdId, int TargetUserId, string Role, int RequestingUserId) : IRequest<IResult>;

public class AddHouseholdMemberHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IRepository<User> userRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<AddHouseholdMemberCommand, IResult>
{
    public async Task<IResult> Handle(AddHouseholdMemberCommand command, CancellationToken ct = default)
    {
        var household = await householdRepository.Query()
            .Where(h => h.Id == command.HouseholdId && h.DeletedOn == null)
            .AnyAsync(ct);

        if (!household)
            return Results.NotFound();

        var requestingMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.RequestingUserId)
            .FirstOrDefaultAsync(ct);

        if (requestingMember is null || requestingMember.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        var targetUser = await userRepository.Query()
            .Where(u => u.Id == command.TargetUserId && u.DeletedOn == null)
            .AnyAsync(ct);

        if (!targetUser)
            return Results.BadRequest("User not found.");

        var existingMembership = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.TargetUserId)
            .AnyAsync(ct);

        if (existingMembership)
            return Results.BadRequest("User is already a member of this household.");

        var member = new HouseholdMember
        {
            HouseholdId = command.HouseholdId,
            UserId = command.TargetUserId,
            Role = command.Role,
            JoinedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        memberRepository.Add(member);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/households/{command.HouseholdId}/members/{command.TargetUserId}", member);
    }
}
