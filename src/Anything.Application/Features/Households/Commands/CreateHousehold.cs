using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Households.Commands;

public record CreateHouseholdCommand(string Name, int UserId) : IRequest<Household>;

public class CreateHouseholdHandler(
    IRepository<Household> householdRepository,
    IRepository<HouseholdMember> memberRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateHouseholdCommand, Household>
{
    public async Task<Household> Handle(CreateHouseholdCommand command, CancellationToken ct = default)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var household = new Household
        {
            Name = command.Name,
            CreatedOn = now
        };
        householdRepository.Add(household);
        await unitOfWork.SaveChanges(ct);

        var member = new HouseholdMember
        {
            HouseholdId = household.Id,
            UserId = command.UserId,
            Role = HouseholdRoles.Owner,
            JoinedOn = now
        };
        memberRepository.Add(member);
        await unitOfWork.SaveChanges(ct);

        return household;
    }
}
