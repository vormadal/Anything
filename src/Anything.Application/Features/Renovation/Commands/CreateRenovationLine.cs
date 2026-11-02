using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record CreateRenovationLineCommand(int ProjectId, int RoomId, SaveRenovationLineRequest Request) : IRequest<IResult>;

public class CreateRenovationLineHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateRenovationLineCommand, IResult>
{
    public async Task<IResult> Handle(CreateRenovationLineCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var room = await repos.Rooms.Query().AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == command.RoomId && r.ProjectId == command.ProjectId
                                      && r.HouseholdId == householdId && r.DeletedOn == null, ct);
        if (room is null)
            return Results.NotFound();

        if (RenovationValidation.ValidateLine(command.Request, out var basis) is { } error)
            return Results.BadRequest(error);
        if (command.Request.MaterialId is { } materialId
            && !await repos.Materials.Query().AnyAsync(m => m.Id == materialId && m.HouseholdId == householdId && m.DeletedOn == null, ct))
            return Results.BadRequest("Invalid material ID.");

        var nextSort = await repos.Lines.Query()
            .Where(l => l.RoomId == room.Id && l.HouseholdId == householdId && l.DeletedOn == null)
            .Select(l => (int?)l.SortOrder)
            .MaxAsync(ct) ?? -1;

        var line = new RenovationLine
        {
            HouseholdId = householdId,
            RoomId = room.Id,
            SortOrder = nextSort + 1,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        RenovationValidation.Apply(line, command.Request, basis);
        repos.Lines.Add(line);
        await unitOfWork.SaveChanges(ct);

        var figures = RenovationCalculator.Figures(line, RenovationCalculator.Measure(room), room.Doors, 0, 0);
        return Results.Created($"/api/renovation-projects/{command.ProjectId}", RenovationMapping.ToResponse(line, figures));
    }
}
