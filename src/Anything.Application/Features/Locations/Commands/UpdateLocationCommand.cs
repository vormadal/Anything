using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Locations.Commands;

public record UpdateLocationCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateLocationHandler(
    IRepository<Location> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateLocationCommand, IResult>
{
    public async Task<IResult> Handle(UpdateLocationCommand command, CancellationToken ct = default)
    {
        var location = await repository.GetById(command.Id);
        if (location is null || location.DeletedOn != null)
            return Results.NotFound();

        location.Name = command.Name;
        location.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
