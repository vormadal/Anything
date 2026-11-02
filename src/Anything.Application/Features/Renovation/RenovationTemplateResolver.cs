using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation;

/// <summary>
/// The room templates one household sees: each built-in, with the household's row for that room
/// type replacing it when one exists, then the household's own room types. Used by both the
/// template list and room creation, so a customised template is what a new room is seeded from.
/// </summary>
public static class RenovationTemplateResolver
{
    public static async Task<List<ResolvedRoomTemplate>> Resolve(
        RenovationRepositories repos, int householdId, CancellationToken ct)
    {
        var rows = await repos.RoomTemplates.Query().AsNoTracking()
            .Where(t => t.HouseholdId == householdId && t.DeletedOn == null)
            .ToListAsync(ct);
        var rowIds = rows.Select(t => t.Id).ToList();
        var lines = await repos.RoomTemplateLines.Query().AsNoTracking()
            .Where(l => rowIds.Contains(l.TemplateId))
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Id)
            .ToListAsync(ct);
        return Merge(rows, lines);
    }

    public static ResolvedRoomTemplate? Find(IEnumerable<ResolvedRoomTemplate> templates, string roomType) =>
        templates.FirstOrDefault(t => string.Equals(t.Template.RoomType, roomType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Overlays a household's rows on the built-ins. Built-ins come first in code order; custom
    /// room types follow, ordered by label. Rows must already be filtered to one household and to
    /// live rows.
    /// </summary>
    public static List<ResolvedRoomTemplate> Merge(
        IReadOnlyList<RenovationRoomTemplate> rows, IReadOnlyList<RenovationRoomTemplateLine> lines)
    {
        var linesByTemplate = lines.ToLookup(l => l.TemplateId);
        var owned = rows.OrderBy(r => r.Id)
            .DistinctBy(r => r.RoomType, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                r => r.RoomType,
                r => ToTemplate(r, linesByTemplate[r.Id]),
                StringComparer.OrdinalIgnoreCase);

        var result = new List<ResolvedRoomTemplate>();
        foreach (var builtIn in RenovationRoomTemplates.All)
        {
            result.Add(owned.TryGetValue(builtIn.RoomType, out var own)
                ? new ResolvedRoomTemplate(own, IsBuiltIn: true, IsCustomised: true)
                : new ResolvedRoomTemplate(builtIn, IsBuiltIn: true, IsCustomised: false));
        }

        var custom = owned.Values
            .Where(t => RenovationRoomTemplates.Find(t.RoomType) is null)
            .OrderBy(t => t.Label, StringComparer.OrdinalIgnoreCase)
            .ThenBy(t => t.RoomType, StringComparer.Ordinal);
        result.AddRange(custom.Select(t => new ResolvedRoomTemplate(t, IsBuiltIn: false, IsCustomised: false)));
        return result;
    }

    private static RenovationRoomTemplates.Template ToTemplate(
        RenovationRoomTemplate row, IEnumerable<RenovationRoomTemplateLine> lines) => new(
        row.RoomType, row.Label, row.Length, row.Width, row.Height, row.Doors, row.Windows,
        lines.Select(l => new RenovationRoomTemplates.TemplateLine(
            l.Key, l.Label, l.Group, l.MaterialName, l.Category, l.Basis, l.Unit,
            l.DefaultPrice, l.WastePercent, l.FixedQuantity, l.EnabledByDefault)).ToList());
}
