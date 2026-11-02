namespace Anything.Core.Entities;

/// <summary>
/// One budget line of a household's room template. Mirrors the built-in template line: rooms
/// created from a household-owned template copy its price, unit and waste.
/// </summary>
public class RenovationRoomTemplateLine
{
    public int Id { get; set; }
    public int TemplateId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string MaterialName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public RenovationQuantityBasis Basis { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal DefaultPrice { get; set; }
    public decimal WastePercent { get; set; }
    public decimal? FixedQuantity { get; set; }
    public bool EnabledByDefault { get; set; }
    public int SortOrder { get; set; }
}
