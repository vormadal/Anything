using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationProjectCommand(int Id) : IRequest<IResult>;

/// <summary>Soft-deletes the project together with its rooms, lines and purchases.</summary>
public class DeleteRenovationProjectHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationProjectCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationProjectCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var project = await repos.Projects.Query()
            .FirstOrDefaultAsync(p => p.Id == command.Id && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (project is null)
            return Results.NotFound();

        var now = timeProvider.GetUtcNow().UtcDateTime;
        project.DeletedOn = now;

        var rooms = await repos.Rooms.Query()
            .Where(r => r.ProjectId == project.Id && r.HouseholdId == householdId && r.DeletedOn == null)
            .ToListAsync(ct);
        var roomIds = rooms.Select(r => r.Id).ToList();
        var lines = await repos.Lines.Query()
            .Where(l => roomIds.Contains(l.RoomId) && l.HouseholdId == householdId && l.DeletedOn == null)
            .ToListAsync(ct);
        var purchases = await repos.Purchases.Query()
            .Where(p => p.ProjectId == project.Id && p.HouseholdId == householdId && p.DeletedOn == null)
            .ToListAsync(ct);

        rooms.ForEach(r => r.DeletedOn = now);
        lines.ForEach(l => l.DeletedOn = now);
        purchases.ForEach(p => p.DeletedOn = now);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
