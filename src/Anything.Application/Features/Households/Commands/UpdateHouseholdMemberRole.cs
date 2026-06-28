using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record UpdateHouseholdMemberRoleCommand(int HouseholdId, int TargetUserId, string Role, int RequestingUserId) : IRequest<IResult>;

public class UpdateHouseholdMemberRoleHandler(
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<UpdateHouseholdMemberRoleCommand, IResult>
{
    private static readonly HashSet<string> AllowedRoles =
    [
        HouseholdRoles.Owner,
        HouseholdRoles.Admin,
        HouseholdRoles.Member
    ];

    public async Task<IResult> Handle(UpdateHouseholdMemberRoleCommand command, CancellationToken ct = default)
    {
        if (!AllowedRoles.Contains(command.Role))
            return Results.BadRequest($"Invalid role. Allowed roles are: {string.Join(", ", AllowedRoles)}.");

        var requestingMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.RequestingUserId)
            .FirstOrDefaultAsync(ct);

        // Only the Owner may change member roles or transfer ownership.
        if (requestingMember is null || requestingMember.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        if (command.TargetUserId == command.RequestingUserId)
            return Results.BadRequest("You cannot change your own role.");

        var targetMember = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.HouseholdId && m.UserId == command.TargetUserId)
            .FirstOrDefaultAsync(ct);

        if (targetMember is null)
            return Results.NotFound();

        if (command.Role == HouseholdRoles.Owner)
        {
            // Transfer ownership: promote the target and step the current owner down to Admin.
            targetMember.Role = HouseholdRoles.Owner;
            requestingMember.Role = HouseholdRoles.Admin;
            memberRepository.Update(targetMember);
            memberRepository.Update(requestingMember);
        }
        else
        {
            targetMember.Role = command.Role;
            memberRepository.Update(targetMember);
        }

        await unitOfWork.SaveChanges(ct);

        return Results.NoContent();
    }
}
