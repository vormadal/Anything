using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationRoomTemplateCommand(string RoomType) : IRequest<IResult>;

/// <summary>
/// Soft-deletes this household's version of a room type and drops its lines. For a built-in key
/// the default returns; for a household room type the type is removed. Rooms already created from
/// the template keep the lines they were given.
/// </summary>
public class DeleteRenovationRoomTemplateHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationRoomTemplateCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationRoomTemplateCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var row = await repos.RoomTemplates.Query()
            .FirstOrDefaultAsync(t => t.HouseholdId == householdId && t.RoomType == command.RoomType && t.DeletedOn == null, ct);
        if (row is null)
            return Results.NotFound();

        row.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        var templateId = row.Id;
        var lines = await repos.RoomTemplateLines.Query()
            .Where(l => l.TemplateId == templateId)
            .ToListAsync(ct);
        foreach (var line in lines)
            repos.RoomTemplateLines.Remove(line);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
