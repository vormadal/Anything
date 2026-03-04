using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Somethings.Commands;

public record UpdateSomethingCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateSomethingHandler(IRepository<Something> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateSomethingCommand, IResult>
{
    public async Task<IResult> Handle(UpdateSomethingCommand command, CancellationToken ct = default)
    {
        var something = await repository.GetById(command.Id);
        if (something is null || something.DeletedOn != null)
            return Results.NotFound();

        something.Name = command.Name;
        something.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
