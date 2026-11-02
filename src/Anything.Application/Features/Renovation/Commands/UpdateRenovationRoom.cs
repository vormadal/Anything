using Anything.Contracts.Renovation;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

/// <summary>Renames or resizes a room. Area-based lines re-price on the next read; nothing is stored per line.</summary>
public record UpdateRenovationRoomCommand(int ProjectId, int RoomId, UpdateRenovationRoomRequest Request) : IRequest<IResult>;

public class UpdateRenovationRoomHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateRenovationRoomCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRenovationRoomCommand command, CancellationToken ct = default)
    {
        var room = await repos.Rooms.Query()
            .FirstOrDefaultAsync(r => r.Id == command.RoomId && r.ProjectId == command.ProjectId
                                      && r.HouseholdId == householdContext.HouseholdId && r.DeletedOn == null, ct);
        if (room is null)
            return Results.NotFound();

        var request = command.Request;
        room.Name = request.Name.Trim();
        room.Length = request.Length;
        room.Width = request.Width;
        room.Height = request.Height;
        room.Doors = request.Doors;
        room.Windows = request.Windows;
        room.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
