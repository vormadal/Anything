using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Locations.Commands;

public record DeleteLocationCommand(int Id) : IRequest<IResult>;

public class DeleteLocationHandler(
    IRepository<Location> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<DeleteLocationCommand, IResult>
{
    public async Task<IResult> Handle(DeleteLocationCommand command, CancellationToken ct = default)
    {
        var location = await repository.GetById(command.Id);
        if (location is null || location.DeletedOn != null)
            return Results.NotFound();

        location.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
