using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationLineCommand(int ProjectId, int LineId) : IRequest<IResult>;

/// <summary>Soft-deletes a line; 409 while it has a recorded purchase (that spend would vanish from the totals).</summary>
public class DeleteRenovationLineHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationLineCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationLineCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var line = await (
                from l in repos.Lines.Query()
                join r in repos.Rooms.Query() on l.RoomId equals r.Id
                where l.Id == command.LineId && l.HouseholdId == householdId && l.DeletedOn == null
                      && r.ProjectId == command.ProjectId && r.HouseholdId == householdId && r.DeletedOn == null
                select l)
            .FirstOrDefaultAsync(ct);
        if (line is null)
            return Results.NotFound();

        var purchased = await RenovationPurchaseLookup.LinesWithPurchases(repos, householdId, [line.Id], ct);
        if (purchased.Count > 0)
            return Results.Conflict("This line has recorded purchases. Delete those purchases first.");

        line.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
