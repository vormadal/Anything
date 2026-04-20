using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Locations.Commands;

public record CreateLocationCommand(string Name) : IRequest<Location>;

public class CreateLocationHandler(
    IRepository<Location> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<CreateLocationCommand, Location>
{
    public async Task<Location> Handle(CreateLocationCommand command, CancellationToken ct = default)
    {
        var location = new Location
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repository.Add(location);
        await unitOfWork.SaveChanges(ct);
        return location;
    }
}
