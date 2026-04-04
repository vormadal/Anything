using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record RemoveHouseholdMemberCommand(int HouseholdId, int TargetUserId, int RequestingUserId) : IRequest<IResult>;

public class RemoveHouseholdMemberHandler(
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<RemoveHouseholdMemberCommand, IResult>
{
    public async Task<IResult> Handle(RemoveHouseholdMemberCommand command, CancellationToken ct = default)
    {
        var requestingMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.RequestingUserId)
            .FirstOrDefaultAsync(ct);

        if (requestingMember is null || requestingMember.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        var targetMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.TargetUserId)
            .FirstOrDefaultAsync(ct);

        if (targetMember is null)
            return Results.NotFound();

        if (targetMember.Role == HouseholdRoles.Owner && targetMember.UserId == command.RequestingUserId)
            return Results.BadRequest("Cannot remove yourself as the owner.");

        memberRepository.Remove(targetMember);
        await unitOfWork.SaveChanges(ct);

        return Results.NoContent();
    }
}
