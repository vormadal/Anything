using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record CreateRenovationRoomCommand(int ProjectId, CreateRenovationRoomRequest Request) : IRequest<IResult>;

/// <summary>
/// Adds a room and seeds its lines from the household's effective template for the room type.
/// Built-in lines resolve to the household's own material of the same name, so its price is used.
/// Lines of a household-owned template (customised or household-defined) carry their own price,
/// unit and waste instead. A material is created from the template's defaults the first time
/// it's needed.
/// </summary>
public class CreateRenovationRoomHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateRenovationRoomCommand, IResult>
{
    public async Task<IResult> Handle(CreateRenovationRoomCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var request = command.Request;

        var projectExists = await repos.Projects.Query()
            .AnyAsync(p => p.Id == command.ProjectId && p.HouseholdId == householdId && p.DeletedOn == null, ct);
        if (!projectExists)
            return Results.NotFound();

        var resolved = RenovationTemplateResolver.Find(
            await RenovationTemplateResolver.Resolve(repos, householdId, ct), request.RoomType);
        if (resolved is null)
            return Results.BadRequest($"Unknown room type '{request.RoomType}'.");
        var template = resolved.Template;

        List<RenovationRoomTemplates.TemplateLine> selected;
        if (request.LineKeys is not { } keys)
        {
            selected = template.Lines.Where(l => l.EnabledByDefault).ToList();
        }
        else
        {
            var unknown = keys.Where(k => template.Lines.All(l => l.Key != k)).ToList();
            if (unknown.Count > 0)
                return Results.BadRequest($"Unknown line key(s) for {template.RoomType}: {string.Join(", ", unknown)}.");
            selected = template.Lines.Where(l => keys.Contains(l.Key)).ToList();
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var materials = await ResolveMaterials(selected, householdId, now, ct);

        var nextSort = await repos.Rooms.Query()
            .Where(r => r.ProjectId == command.ProjectId && r.HouseholdId == householdId && r.DeletedOn == null)
            .Select(r => (int?)r.SortOrder)
            .MaxAsync(ct) ?? -1;

        var room = new RenovationRoom
        {
            HouseholdId = householdId,
            ProjectId = command.ProjectId,
            Name = request.Name.Trim(),
            RoomType = template.RoomType,
            Length = request.Length,
            Width = request.Width,
            Height = request.Height,
            Doors = request.Doors,
            Windows = request.Windows,
            SortOrder = nextSort + 1,
            CreatedOn = now
        };
        repos.Rooms.Add(room);
        await unitOfWork.SaveChanges(ct);

        var lines = selected.Select((t, i) =>
        {
            var material = materials[t.MaterialName.ToLowerInvariant()];
            var (unit, price, waste) = resolved.CarriesOwnPrices
                ? (t.Unit, t.Price, t.Waste)
                : (material.Unit, material.DefaultPrice, material.WastePercent);
            return new RenovationLine
            {
                HouseholdId = householdId,
                RoomId = room.Id,
                Label = t.Label,
                Group = t.Group,
                MaterialId = material.Id,
                Description = material.Name,
                Basis = t.Basis,
                FixedQuantity = t.FixedQuantity,
                Unit = unit,
                UnitPrice = price,
                WastePercent = waste,
                SortOrder = i,
                CreatedOn = now
            };
        }).ToList();
        repos.Lines.AddRange(lines);
        await unitOfWork.SaveChanges(ct);

        var response = RenovationProjectLoader.BuildRoom(room, lines, new Dictionary<int, (decimal, decimal)>());
        return Results.Created($"/api/renovation-projects/{command.ProjectId}", response);
    }

    private async Task<Dictionary<string, RenovationMaterial>> ResolveMaterials(
        List<RenovationRoomTemplates.TemplateLine> selected, int householdId, DateTime now, CancellationToken ct)
    {
        var names = selected.Select(t => t.MaterialName.ToLowerInvariant()).Distinct().ToList();
        var existing = await repos.Materials.Query().AsNoTracking()
            .Where(m => m.HouseholdId == householdId && m.DeletedOn == null && names.Contains(m.Name.ToLower()))
            .OrderBy(m => m.Id)
            .ToListAsync(ct);

        var byName = new Dictionary<string, RenovationMaterial>();
        foreach (var m in existing)
            byName.TryAdd(m.Name.ToLowerInvariant(), m);

        var created = selected
            .Where(t => !byName.ContainsKey(t.MaterialName.ToLowerInvariant()))
            .DistinctBy(t => t.MaterialName.ToLowerInvariant())
            .Select(t => new RenovationMaterial
            {
                HouseholdId = householdId,
                Name = t.MaterialName,
                Category = t.Category,
                Unit = t.Unit,
                DefaultPrice = t.Price,
                WastePercent = t.Waste,
                CreatedOn = now
            })
            .ToList();

        if (created.Count > 0)
        {
            repos.Materials.AddRange(created);
            await unitOfWork.SaveChanges(ct);
            foreach (var m in created)
                byName[m.Name.ToLowerInvariant()] = m;
        }

        return byName;
    }
}
