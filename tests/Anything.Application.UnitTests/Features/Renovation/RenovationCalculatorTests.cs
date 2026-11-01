using Anything.Application.Features.Renovation;
using Anything.Core.Entities;
using Xunit;

namespace Anything.Application.UnitTests.Features.Renovation;

public class RenovationCalculatorTests
{
    [Fact]
    public void Measure_SubtractsDoorsAndWindows()
    {
        var m = RenovationCalculator.Measure(4.2m, 3.0m, 2.5m, doors: 1, windows: 1);

        Assert.Equal(12.6m, m.FloorArea);
        Assert.Equal(32.61m, m.WallArea);   // 36 − 1.89 − 1.5
        Assert.Equal(13.5m, m.Perimeter);   // 14.4 − 0.9
    }

    [Fact]
    public void Measure_NeverGoesNegative()
    {
        var m = RenovationCalculator.Measure(1m, 1m, 1m, doors: 5, windows: 5);

        Assert.Equal(0m, m.WallArea);
        Assert.Equal(0m, m.Perimeter);
    }

    [Theory]
    [InlineData(RenovationQuantityBasis.Floor, null, 13.86)]       // 12.6 × 1.1
    [InlineData(RenovationQuantityBasis.Perimeter, null, 14.85)]   // 13.5 × 1.1
    [InlineData(RenovationQuantityBasis.FloorAndWall, null, 49.73)] // 45.21 × 1.1
    [InlineData(RenovationQuantityBasis.Fixed, 3.0, 3.3)]
    [InlineData(RenovationQuantityBasis.Doors, null, 1.1)]
    public void RequiredQuantity_AppliesWaste(RenovationQuantityBasis basis, double? fixedQty, double expected)
    {
        var line = Line(basis, price: 100m, waste: 10m, fixedQty: (decimal?)fixedQty);

        var qty = RenovationCalculator.RequiredQuantity(line, Kitchen(), doors: 1);

        Assert.Equal((decimal)expected, qty);
    }

    [Fact]
    public void Figures_NothingBought_ForecastEqualsEstimate()
    {
        var f = RenovationCalculator.Figures(Line(RenovationQuantityBasis.Floor, 289m, 10m), Kitchen(), 1, 0, 0);

        Assert.Equal(13.86m, f.RequiredQuantity);
        Assert.Equal(4005.54m, f.Estimate);
        Assert.Equal(4005.54m, f.Forecast);
        Assert.Equal(RenovationCalculator.StatusNotStarted, f.Status);
    }

    [Fact]
    public void Figures_PartialPurchase_ForecastsRemainingAtUnitPrice()
    {
        var f = RenovationCalculator.Figures(Line(RenovationQuantityBasis.Floor, 289m, 10m), Kitchen(), 1,
            purchasedQuantity: 6m, actual: 1800m);

        Assert.Equal(7.86m, f.RemainingQuantity);
        Assert.Equal(1800m + 7.86m * 289m, f.Forecast);
        Assert.Equal(RenovationCalculator.StatusPartial, f.Status);
    }

    [Fact]
    public void Figures_FullQuantityBought_IsCompleteAndForecastIsActual()
    {
        var f = RenovationCalculator.Figures(Line(RenovationQuantityBasis.Floor, 289m, 10m), Kitchen(), 1,
            purchasedQuantity: 14m, actual: 4390m);

        Assert.Equal(0m, f.RemainingQuantity);
        Assert.Equal(4390m, f.Forecast);
        Assert.Equal(RenovationCalculator.StatusComplete, f.Status);
    }

    [Fact]
    public void Figures_MarkedComplete_StopsForecastingTheRest()
    {
        var line = Line(RenovationQuantityBasis.Floor, 289m, 10m);
        line.IsComplete = true;

        var f = RenovationCalculator.Figures(line, Kitchen(), 1, purchasedQuantity: 12.6m, actual: 3700m);

        Assert.Equal(3700m, f.Forecast);
        Assert.Equal(RenovationCalculator.StatusComplete, f.Status);
    }

    [Fact]
    public void Split_IsProportionalAndSumsExactly()
    {
        var amounts = RenovationCalculator.Split(8420m, [3662m, 1526m, 669m, 2200m]);

        Assert.Equal(8420m, amounts.Sum());
        Assert.Equal(Math.Round(8420m * 3662m / 8057m, 2), amounts[0]);
    }

    [Fact]
    public void Split_ZeroWeights_SplitsEvenly()
    {
        var amounts = RenovationCalculator.Split(100m, [0m, 0m, 0m]);

        Assert.Equal(new[] { 33.33m, 33.33m, 33.34m }, amounts);
    }

    [Fact]
    public void Split_Empty_ReturnsEmpty()
    {
        Assert.Empty(RenovationCalculator.Split(100m, []));
    }

    private static RoomMeasurements Kitchen() => RenovationCalculator.Measure(4.2m, 3.0m, 2.5m, 1, 1);

    private static RenovationLine Line(RenovationQuantityBasis basis, decimal price, decimal waste, decimal? fixedQty = null) =>
        new() { Basis = basis, UnitPrice = price, WastePercent = waste, FixedQuantity = fixedQty };
}

public class RenovationRoomTemplatesTests
{
    [Fact]
    public void EveryTemplate_HasUniqueLineKeys()
    {
        foreach (var t in RenovationRoomTemplates.All)
            Assert.Equal(t.Lines.Count, t.Lines.Select(l => l.Key).Distinct().Count());
    }

    [Fact]
    public void FixedLines_AlwaysHaveAQuantity()
    {
        var fixedLines = RenovationRoomTemplates.All.SelectMany(t => t.Lines)
            .Where(l => l.Basis == RenovationQuantityBasis.Fixed);
        Assert.All(fixedLines, l => Assert.NotNull(l.FixedQuantity));
    }

    [Fact]
    public void SameMaterialName_HasSameDefaultsEverywhere()
    {
        // Rooms resolve template lines to household materials by name, so two templates
        // disagreeing on one name's price would make the second one silently use the first's.
        var conflicts = RenovationRoomTemplates.All.SelectMany(t => t.Lines)
            .GroupBy(l => l.MaterialName.ToLowerInvariant())
            .Where(g => g.Select(l => (l.Price, l.Waste, l.Unit, l.Category)).Distinct().Count() > 1)
            .Select(g => g.Key);
        Assert.Empty(conflicts);
    }

    [Fact]
    public void KitchenDefaults_EstimateMatchesDesign()
    {
        var t = RenovationRoomTemplates.Find("kitchen")!;
        var m = RenovationCalculator.Measure(t.Length, t.Width, t.Height, t.Doors, t.Windows);

        var total = t.Lines.Where(l => l.EnabledByDefault).Sum(l =>
            RenovationCalculator.Figures(
                new RenovationLine { Basis = l.Basis, FixedQuantity = l.FixedQuantity, UnitPrice = l.Price, WastePercent = l.Waste },
                m, t.Doors, 0, 0).Estimate);

        Assert.Equal(102183.94m, total);
    }

    [Theory]
    [InlineData("https://example.com/p", true)]
    [InlineData("http://example.com", true)]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("/relative", false)]
    [InlineData("ftp://example.com", false)]
    public void IsValidProductUrl(string? url, bool expected)
    {
        Assert.Equal(expected, RenovationValidation.IsValidProductUrl(url));
    }
}
