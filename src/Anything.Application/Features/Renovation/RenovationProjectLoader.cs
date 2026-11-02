using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation;

/// <summary>
/// Loads one or all of a household's projects with every room, line and active purchase
/// allocation, and computes the estimate/actual/forecast figures. Four queries regardless of
/// project count — never one per room or line.
/// </summary>
public static class RenovationProjectLoader
{
    public static async Task<List<RenovationProjectResponse>> Load(
        RenovationRepositories repos, int householdId, int? projectId, CancellationToken ct)
    {
        var projects = await repos.Projects.Query().AsNoTracking()
            .Where(p => p.HouseholdId == householdId && p.DeletedOn == null && (projectId == null || p.Id == projectId))
            .OrderBy(p => p.CreatedOn)
            .ToListAsync(ct);
        if (projects.Count == 0)
            return [];

        var projectIds = projects.Select(p => p.Id).ToList();
        var rooms = await repos.Rooms.Query().AsNoTracking()
            .Where(r => r.HouseholdId == householdId && r.DeletedOn == null && projectIds.Contains(r.ProjectId))
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Id)
            .ToListAsync(ct);

        var roomIds = rooms.Select(r => r.Id).ToList();
        var lines = await repos.Lines.Query().AsNoTracking()
            .Where(l => l.HouseholdId == householdId && l.DeletedOn == null && roomIds.Contains(l.RoomId))
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Id)
            .ToListAsync(ct);

        var allocations = await (
                from a in repos.Allocations.Query().AsNoTracking()
                join p in repos.Purchases.Query().AsNoTracking() on a.PurchaseId equals p.Id
                where p.HouseholdId == householdId && p.DeletedOn == null && projectIds.Contains(p.ProjectId)
                select new { a.LineId, a.Quantity, a.Amount })
            .ToListAsync(ct);

        var bought = allocations
            .GroupBy(a => a.LineId)
            .ToDictionary(g => g.Key, g => (Quantity: g.Sum(a => a.Quantity), Amount: g.Sum(a => a.Amount)));
        var linesByRoom = lines.ToLookup(l => l.RoomId);
        var roomsByProject = rooms.ToLookup(r => r.ProjectId);

        return projects.Select(p =>
        {
            var roomResponses = roomsByProject[p.Id]
                .Select(r => BuildRoom(r, linesByRoom[r.Id], bought))
                .ToList();
            return new RenovationProjectResponse(
                p.Id, p.Name, p.Budget, p.Notes,
                roomResponses.Sum(r => r.Estimate),
                roomResponses.Sum(r => r.Actual),
                roomResponses.Sum(r => r.Forecast),
                roomResponses, p.CreatedOn, p.ModifiedOn);
        }).ToList();
    }

    public static RenovationRoomResponse BuildRoom(
        RenovationRoom room,
        IEnumerable<RenovationLine> lines,
        IReadOnlyDictionary<int, (decimal Quantity, decimal Amount)> bought)
    {
        var m = RenovationCalculator.Measure(room);
        var lineResponses = lines.Select(l =>
        {
            var (qty, amount) = bought.TryGetValue(l.Id, out var b) ? b : (0m, 0m);
            return RenovationMapping.ToResponse(l, RenovationCalculator.Figures(l, m, room.Doors, qty, amount));
        }).ToList();

        return new RenovationRoomResponse(
            room.Id, room.Name, room.RoomType, room.Length, room.Width, room.Height, room.Doors, room.Windows,
            room.SortOrder, m.FloorArea, m.WallArea, m.Perimeter,
            lineResponses.Sum(l => l.Estimate),
            lineResponses.Sum(l => l.Actual),
            lineResponses.Sum(l => l.Forecast),
            lineResponses);
    }
}
