using Anything.Contracts.Renovation;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record ReplaceRenovationMaterialCommand(int ProjectId, int FromMaterialId, int ToMaterialId) : IRequest<IResult>;

/// <summary>
/// "Use this material in all rooms": re-points every line in the project that uses one material at
/// another. Lines with a recorded purchase keep what was actually bought.
/// </summary>
public class ReplaceRenovationMaterialHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<ReplaceRenovationMaterialCommand, IResult>
{
    public async Task<IResult> Handle(ReplaceRenovationMaterialCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var projectExists = await repos.Projects.Query()
            .AnyAsync(p => p.Id == command.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (!projectExists)
            return Results.NotFound();

        var target = await repos.Materials.Query().AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == command.ToMaterialId && m.HouseholdId == householdId && m.DeletedOn == null, ct);
        if (target is null)
            return Results.BadRequest("Invalid material ID.");

        int? fromId = command.FromMaterialId;
        var lines = await (
                from l in repos.Lines.Query()
                join r in repos.Rooms.Query() on l.RoomId equals r.Id
                where l.MaterialId == fromId && l.HouseholdId == householdId && l.DeletedOn == null
                      && r.ProjectId == command.ProjectId && r.HouseholdId == householdId && r.DeletedOn == null
                select l)
            .ToListAsync(ct);

        var purchased = await RenovationPurchaseLookup.LinesWithPurchases(
            repos, householdId, lines.Select(l => l.Id).ToList(), ct);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var updated = 0;
        foreach (var line in lines.Where(l => !purchased.Contains(l.Id)))
        {
            line.MaterialId = target.Id;
            line.Description = target.Name;
            line.Unit = target.Unit;
            line.UnitPrice = target.DefaultPrice;
            line.WastePercent = target.WastePercent;
            line.ModifiedOn = now;
            updated++;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.Ok(new ReplaceRenovationMaterialResponse(updated, lines.Count - updated));
    }
}
