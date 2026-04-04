using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record UpdateHouseholdCommand(int Id, string Name, int UserId) : IRequest<IResult>;

public class UpdateHouseholdHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateHouseholdCommand, IResult>
{
    public async Task<IResult> Handle(UpdateHouseholdCommand command, CancellationToken ct = default)
    {
        var household = await householdRepository.Query()
            .Where(h => h.Id == command.Id && h.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (household is null)
            return Results.NotFound();

        var membership = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.Id && m.UserId == command.UserId)
            .FirstOrDefaultAsync(ct);

        if (membership is null || membership.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        household.Name = command.Name;
        household.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        householdRepository.Update(household);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(household);
    }
}
