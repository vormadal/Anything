using Anything.Contracts.Renovation;
using Anything.Core.Entities;

namespace Anything.Application.Features.Renovation;

/// <summary>
/// Built-in room types and the budget lines each starts with. Each line names a material; when a
/// room is created the household's own material of that name is used (its price wins), and one is
/// created from these defaults if the household doesn't have it yet.
/// </summary>
public static class RenovationRoomTemplates
{
    public sealed record TemplateLine(
        string Key,
        string Label,
        string Group,
        string MaterialName,
        string Category,
        RenovationQuantityBasis Basis,
        string Unit,
        decimal Price,
        decimal Waste,
        decimal? FixedQuantity = null,
        bool EnabledByDefault = true);

    public sealed record Template(
        string RoomType,
        string Label,
        decimal Length,
        decimal Width,
        decimal Height,
        int Doors,
        int Windows,
        IReadOnlyList<TemplateLine> Lines);

    private const string Surfaces = "Surfaces";
    private const string Fixtures = "Fixtures";
    private const string Labour = "Labour";

    private static readonly TemplateLine[] DrySurfaces =
    [
        new("floor", "Floor", Surfaces, "Oak laminate 8 mm", "Flooring", RenovationQuantityBasis.Floor, "m²", 289m, 10m),
        new("underlay", "Underlay", Surfaces, "Foam underlay 3 mm", "Flooring", RenovationQuantityBasis.Floor, "m²", 39m, 5m),
        new("walls", "Walls", Surfaces, "Wall paint, 2 coats", "Paint", RenovationQuantityBasis.Wall, "m²", 48m, 0m),
        new("ceiling", "Ceiling", Surfaces, "Ceiling paint", "Paint", RenovationQuantityBasis.Ceiling, "m²", 35m, 0m),
        new("skirting", "Skirting", Surfaces, "Oak skirting 12×58", "Trim", RenovationQuantityBasis.Perimeter, "m", 59m, 10m),
    ];

    private static readonly TemplateLine[] RoomExtras =
    [
        new("doors", "Doors", Fixtures, "Interior door with frame", "Fixtures", RenovationQuantityBasis.Doors, "pcs", 2400m, 0m, EnabledByDefault: false),
        new("electrician", "Electrician", Labour, "Electrician, sockets and lights", "Labour", RenovationQuantityBasis.Fixed, "job", 6500m, 0m, 1m, EnabledByDefault: false),
    ];

    public static readonly IReadOnlyList<Template> All =
    [
        new("kitchen", "Kitchen", 4.2m, 3.0m, 2.5m, 1, 1,
        [
            .. DrySurfaces,
            new("cabinets", "Cabinets", Fixtures, "Kitchen cabinets, 8 units", "Fixtures", RenovationQuantityBasis.Fixed, "set", 42000m, 0m, 1m),
            new("countertop", "Countertop", Fixtures, "Oak countertop 38 mm", "Fixtures", RenovationQuantityBasis.Fixed, "m", 1950m, 0m, 3.6m),
            new("backsplash", "Backsplash", Fixtures, "Wall tiles 10×20", "Tiles", RenovationQuantityBasis.Fixed, "m²", 420m, 0m, 3m),
            new("appliances", "Appliances", Fixtures, "Oven, hob, fridge, dishwasher", "Fixtures", RenovationQuantityBasis.Fixed, "set", 24000m, 0m, 1m),
            new("electrician", "Electrician", Labour, "Electrician, kitchen", "Labour", RenovationQuantityBasis.Fixed, "job", 12000m, 0m, 1m),
            new("plumber", "Plumber", Labour, "Plumber, kitchen", "Labour", RenovationQuantityBasis.Fixed, "job", 8500m, 0m, 1m),
        ]),
        new("bathroom", "Bathroom", 2.4m, 1.8m, 2.4m, 1, 0,
        [
            new("floor", "Floor", Surfaces, "Floor tiles 30×60", "Tiles", RenovationQuantityBasis.Floor, "m²", 495m, 10m),
            new("walls", "Walls", Surfaces, "Wall tiles 30×60", "Tiles", RenovationQuantityBasis.Wall, "m²", 395m, 10m),
            new("membrane", "Waterproofing", Surfaces, "Wet-room membrane system", "Tiles", RenovationQuantityBasis.FloorAndWall, "m²", 180m, 0m),
            new("ceiling", "Ceiling", Surfaces, "Wet-room ceiling paint", "Paint", RenovationQuantityBasis.Ceiling, "m²", 55m, 0m),
            new("toilet", "Toilet", Fixtures, "Wall-hung toilet", "Fixtures", RenovationQuantityBasis.Fixed, "pcs", 4200m, 0m, 1m),
            new("vanity", "Vanity", Fixtures, "Vanity with sink", "Fixtures", RenovationQuantityBasis.Fixed, "pcs", 6800m, 0m, 1m),
            new("shower", "Shower", Fixtures, "Thermostatic shower set", "Fixtures", RenovationQuantityBasis.Fixed, "pcs", 5900m, 0m, 1m),
            new("heating", "Floor heating", Fixtures, "Electric underfloor mat", "Fixtures", RenovationQuantityBasis.Fixed, "set", 3200m, 0m, 1m),
            new("tiler", "Tiler", Labour, "Tiler", "Labour", RenovationQuantityBasis.FloorAndWall, "m²", 650m, 0m),
            new("plumber", "Plumber", Labour, "Plumber, bathroom", "Labour", RenovationQuantityBasis.Fixed, "job", 18000m, 0m, 1m),
            new("electrician", "Electrician", Labour, "Electrician, bathroom", "Labour", RenovationQuantityBasis.Fixed, "job", 5000m, 0m, 1m),
        ]),
        new("bedroom", "Bedroom", 3.6m, 3.2m, 2.5m, 1, 1, [.. DrySurfaces, .. RoomExtras]),
        new("living", "Living room", 5.5m, 4.2m, 2.5m, 2, 2, [.. DrySurfaces, .. RoomExtras]),
        new("hallway", "Hallway", 4.0m, 1.2m, 2.5m, 3, 0, [.. DrySurfaces, .. RoomExtras]),
        new("custom", "Custom", 3.0m, 3.0m, 2.5m, 1, 1,
            [.. DrySurfaces.Select(l => l with { EnabledByDefault = false }), .. RoomExtras]),
    ];

    public static Template? Find(string roomType) =>
        All.FirstOrDefault(t => string.Equals(t.RoomType, roomType, StringComparison.OrdinalIgnoreCase));

    public static RenovationRoomTemplateResponse ToResponse(Template t) => new(
        t.RoomType, t.Label, t.Length, t.Width, t.Height, t.Doors, t.Windows,
        t.Lines.Select(l => new RenovationTemplateLineResponse(
            l.Key, l.Label, l.Group, l.MaterialName, l.Category, l.Basis.ToString(), l.Unit,
            l.Price, l.Waste, l.FixedQuantity, l.EnabledByDefault)).ToList());
}
