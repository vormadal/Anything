using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Locations.Commands;

public record UpdateLocationCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateLocationHandler(
    IRepository<Location> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateLocationCommand, IResult>
{
    public async Task<IResult> Handle(UpdateLocationCommand command, CancellationToken ct = default)
    {
        var location = await repository.Query()
            .Where(l => l.Id == command.Id && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (location is null)
            return Results.NotFound();

        location.Name = command.Name;
        location.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
