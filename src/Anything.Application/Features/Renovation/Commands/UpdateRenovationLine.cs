using Anything.Contracts.Renovation;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

/// <summary>Replaces a line's fields — including swapping its material — and its done flag.</summary>
public record UpdateRenovationLineCommand(int ProjectId, int LineId, SaveRenovationLineRequest Request) : IRequest<IResult>;

public class UpdateRenovationLineHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateRenovationLineCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRenovationLineCommand command, CancellationToken ct = default)
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

        if (RenovationValidation.ValidateLine(command.Request, out var basis) is { } error)
            return Results.BadRequest(error);
        if (command.Request.MaterialId is { } materialId
            && materialId != line.MaterialId
            && !await repos.Materials.Query().AnyAsync(m => m.Id == materialId && m.HouseholdId == householdId && m.DeletedOn == null, ct))
            return Results.BadRequest("Invalid material ID.");

        RenovationValidation.Apply(line, command.Request, basis);
        line.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
