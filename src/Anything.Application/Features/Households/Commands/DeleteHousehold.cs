using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Households.Commands;

public record DeleteHouseholdCommand(int Id, int UserId) : IRequest<IResult>;

public class DeleteHouseholdHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteHouseholdCommand, IResult>
{
    public async Task<IResult> Handle(DeleteHouseholdCommand command, CancellationToken ct = default)
    {
        var household = await householdRepository.Query()
            .Where(h => h.Id == command.Id && h.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (household is null)
            return Results.NotFound();

        var membership = await memberRepository.Query()
            .Where(m => m.HouseholdId == command.Id && m.UserId == command.UserId)
            .FirstOrDefaultAsync(ct);

        if (membership?.Role != HouseholdRoles.Owner)
            return Results.Forbid();

        household.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        householdRepository.Update(household);
        await unitOfWork.SaveChanges(ct);

        return Results.NoContent();
    }
}
