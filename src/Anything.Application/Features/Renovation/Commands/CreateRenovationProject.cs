using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Renovation.Commands;

public record CreateRenovationProjectCommand(string Name, decimal? Budget, string? Notes) : IRequest<IResult>;

public class CreateRenovationProjectHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateRenovationProjectCommand, IResult>
{
    public async Task<IResult> Handle(CreateRenovationProjectCommand command, CancellationToken ct = default)
    {
        var project = new RenovationProject
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name.Trim(),
            Budget = command.Budget,
            Notes = command.Notes,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repos.Projects.Add(project);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/renovation-projects/{project.Id}", new RenovationProjectResponse(
            project.Id, project.Name, project.Budget, project.Notes, 0, 0, 0, [], project.CreatedOn, project.ModifiedOn));
    }
}
