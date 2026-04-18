using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Somethings.Commands;

public record CreateSomethingCommand(string Name) : IRequest<Something>;

public class CreateSomethingHandler(IRepository<Something> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IHouseholdContext householdContext)
    : IRequestHandler<CreateSomethingCommand, Something>
{
    public async Task<Something> Handle(CreateSomethingCommand command, CancellationToken ct = default)
    {
        var entity = new Something { HouseholdId = householdContext.HouseholdId, Name = command.Name, CreatedOn = timeProvider.GetUtcNow().UtcDateTime };
        repository.Add(entity);
        await unitOfWork.SaveChanges(ct);
        return entity;
    }
}
