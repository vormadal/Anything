using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Somethings.Commands;

public record DeleteSomethingCommand(int Id) : IRequest<IResult>;

public class DeleteSomethingHandler(IRepository<Something> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider, IHouseholdContext householdContext)
    : IRequestHandler<DeleteSomethingCommand, IResult>
{
    public async Task<IResult> Handle(DeleteSomethingCommand command, CancellationToken ct = default)
    {
        var something = await repository.Query()
            .Where(s => s.Id == command.Id && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (something is null)
            return Results.NotFound();

        something.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
