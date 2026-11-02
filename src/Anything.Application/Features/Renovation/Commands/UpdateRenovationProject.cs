using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record UpdateRenovationProjectCommand(int Id, string Name, decimal? Budget, string? Notes) : IRequest<IResult>;

public class UpdateRenovationProjectHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateRenovationProjectCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRenovationProjectCommand command, CancellationToken ct = default)
    {
        var project = await repos.Projects.Query()
            .FirstOrDefaultAsync(p => p.Id == command.Id && p.HouseholdId == householdContext.HouseholdId && p.DeletedOn == null, ct);
        if (project is null)
            return Results.NotFound();

        project.Name = command.Name.Trim();
        project.Budget = command.Budget;
        project.Notes = command.Notes;
        project.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
