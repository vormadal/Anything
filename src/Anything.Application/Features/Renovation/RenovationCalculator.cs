using Anything.Core.Entities;

namespace Anything.Application.Features.Renovation;

/// <summary>Room measurements derived from dimensions, in m² (areas) and m (perimeter).</summary>
public readonly record struct RoomMeasurements(decimal FloorArea, decimal WallArea, decimal Perimeter);

/// <summary>A line's derived numbers given its room and what has been bought for it.</summary>
public readonly record struct LineFigures(
    decimal RequiredQuantity,
    decimal PurchasedQuantity,
    decimal RemainingQuantity,
    decimal Estimate,
    decimal Actual,
    decimal Forecast,
    string Status);

/// <summary>
/// The budget arithmetic for renovation projects, in one place. The frontend's add-room wizard
/// mirrors <see cref="Measure(decimal, decimal, decimal, int, int)"/> and <see cref="RequiredQuantity"/>
/// to show a live estimate before the room exists — change both together.
/// </summary>
public static class RenovationCalculator
{
    /// <summary>Opening sizes subtracted from wall area/perimeter: a 0.9 × 2.1 m door, a 1.5 m² window.</summary>
    public const decimal DoorArea = 1.89m;
    public const decimal DoorWidth = 0.9m;
    public const decimal WindowArea = 1.5m;

    public const string StatusNotStarted = "NotStarted";
    public const string StatusPartial = "Partial";
    public const string StatusComplete = "Complete";

    public static RoomMeasurements Measure(decimal length, decimal width, decimal height, int doors, int windows)
    {
        var floor = Round(length * width);
        var wall = Round(Math.Max(0, 2 * (length + width) * height - DoorArea * doors - WindowArea * windows));
        var perimeter = Round(Math.Max(0, 2 * (length + width) - DoorWidth * doors));
        return new RoomMeasurements(floor, wall, perimeter);
    }

    public static RoomMeasurements Measure(RenovationRoom room) =>
        Measure(room.Length, room.Width, room.Height, room.Doors, room.Windows);

    /// <summary>The quantity the basis measures, before waste.</summary>
    public static decimal BaseQuantity(RenovationQuantityBasis basis, decimal? fixedQuantity, RoomMeasurements m, int doors) =>
        basis switch
        {
            RenovationQuantityBasis.Floor => m.FloorArea,
            RenovationQuantityBasis.Ceiling => m.FloorArea,
            RenovationQuantityBasis.Wall => m.WallArea,
            RenovationQuantityBasis.Perimeter => m.Perimeter,
            RenovationQuantityBasis.FloorAndWall => m.FloorArea + m.WallArea,
            RenovationQuantityBasis.Doors => doors,
            _ => fixedQuantity ?? 0
        };

    public static decimal RequiredQuantity(RenovationLine line, RoomMeasurements m, int doors) =>
        Round(BaseQuantity(line.Basis, line.FixedQuantity, m, doors) * (1 + line.WastePercent / 100m));

    public static LineFigures Figures(RenovationLine line, RoomMeasurements m, int doors, decimal purchasedQuantity, decimal actual)
    {
        var required = RequiredQuantity(line, m, doors);
        var remaining = Math.Max(0, required - purchasedQuantity);
        var complete = line.IsComplete || (purchasedQuantity > 0 && remaining == 0);
        if (complete)
            remaining = 0;

        var estimate = Round(required * line.UnitPrice);
        var forecast = Round(actual + remaining * line.UnitPrice);
        var status = complete ? StatusComplete : purchasedQuantity > 0 ? StatusPartial : StatusNotStarted;
        return new LineFigures(required, purchasedQuantity, remaining, estimate, actual, forecast, status);
    }

    /// <summary>
    /// Splits <paramref name="total"/> across lines in proportion to their weights (each line's
    /// estimate for the quantity bought). Amounts are rounded to øre/cents and the last line takes
    /// the rounding remainder, so they always sum to exactly <paramref name="total"/>. When every
    /// weight is zero the total is split evenly.
    /// </summary>
    public static decimal[] Split(decimal total, IReadOnlyList<decimal> weights)
    {
        if (weights.Count == 0)
            return [];

        var sum = weights.Sum();
        var result = new decimal[weights.Count];
        var given = 0m;
        for (var i = 0; i < weights.Count - 1; i++)
        {
            var share = sum > 0 ? weights[i] / sum : 1m / weights.Count;
            result[i] = Round(total * share);
            given += result[i];
        }
        result[^1] = Round(total - given);
        return result;
    }

    public static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
