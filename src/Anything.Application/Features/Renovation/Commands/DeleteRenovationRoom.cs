using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationRoomCommand(int ProjectId, int RoomId) : IRequest<IResult>;

/// <summary>
/// Soft-deletes a room and its lines. Refused with 409 while any line has a recorded purchase —
/// deleting it would silently drop real spending from the project's totals.
/// </summary>
public class DeleteRenovationRoomHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationRoomCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationRoomCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var room = await repos.Rooms.Query()
            .FirstOrDefaultAsync(r => r.Id == command.RoomId && r.ProjectId == command.ProjectId
                                      && r.HouseholdId == householdId && r.DeletedOn == null, ct);
        if (room is null)
            return Results.NotFound();

        var lines = await repos.Lines.Query()
            .Where(l => l.RoomId == room.Id && l.HouseholdId == householdId && l.DeletedOn == null)
            .ToListAsync(ct);
        var purchased = await RenovationPurchaseLookup.LinesWithPurchases(
            repos, householdId, lines.Select(l => l.Id).ToList(), ct);
        if (purchased.Count > 0)
            return Results.Conflict("This room has recorded purchases. Delete those purchases first.");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        room.DeletedOn = now;
        lines.ForEach(l => l.DeletedOn = now);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
