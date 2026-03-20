using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Locations.Commands;

public record CreateLocationCommand(string Name) : IRequest<Location>;

public class CreateLocationHandler(
    IRepository<Location> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<CreateLocationCommand, Location>
{
    public async Task<Location> Handle(CreateLocationCommand command, CancellationToken ct = default)
    {
        var location = new Location
        {
            Name = command.Name,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repository.Add(location);
        await unitOfWork.SaveChanges(ct);
        return location;
    }
}
