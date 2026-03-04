using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Somethings.Commands;

public record DeleteSomethingCommand(int Id) : IRequest<IResult>;

public class DeleteSomethingHandler(IRepository<Something> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteSomethingCommand, IResult>
{
    public async Task<IResult> Handle(DeleteSomethingCommand command, CancellationToken ct = default)
    {
        var something = await repository.GetById(command.Id);
        if (something is null || something.DeletedOn != null)
            return Results.NotFound();

        something.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
