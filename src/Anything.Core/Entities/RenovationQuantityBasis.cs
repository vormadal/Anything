namespace Anything.Core.Entities;

/// <summary>What a renovation line's quantity is measured from.</summary>
public enum RenovationQuantityBasis
{
    /// <summary>Length × width.</summary>
    Floor,
    /// <summary>Wall area minus door and window openings.</summary>
    Wall,
    /// <summary>Same as floor area.</summary>
    Ceiling,
    /// <summary>Room perimeter minus door widths (skirting, trim).</summary>
    Perimeter,
    /// <summary>Floor plus wall area (waterproofing, tiling labour).</summary>
    FloorAndWall,
    /// <summary>One per door.</summary>
    Doors,
    /// <summary>A fixed quantity entered on the line.</summary>
    Fixed
}
