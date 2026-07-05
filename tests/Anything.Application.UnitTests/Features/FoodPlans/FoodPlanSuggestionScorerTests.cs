using Anything.Application.Features.FoodPlans;
using Anything.Core.Entities;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class FoodPlanSuggestionScorerTests
{
    // Wednesday mid-July; far from the seasonal window of any January/December test dates.
    private static readonly DateOnly Target = new(2026, 7, 15);

    private static SuggestionCandidate Candidate(
        int id, string name, IEnumerable<DateOnly>? dates = null, IEnumerable<string>? tags = null) =>
        new(id, name, (dates ?? []).ToList(), (tags ?? []).ToList());

    private static List<ScoredSuggestion> Score(
        DateOnly target,
        IEnumerable<SuggestionCandidate> candidates,
        SuggestionScoringOptions? options = null,
        IReadOnlyList<SeasonalTagRule>? rules = null) =>
        FoodPlanSuggestionScorer.Score(target, candidates, options ?? SuggestionScoringOptions.Default, rules ?? []);

    private static SeasonalTagRule Rule(string keyword, int months, int boost, bool matchPrefix = false) =>
        new() { HouseholdId = 1, Keyword = keyword, MatchPrefix = matchPrefix, Months = months, Boost = boost };

    private static int MonthMask(params int[] months) =>
        months.Aggregate(0, (mask, month) => mask | (1 << (month - 1)));

    [Theory]
    [InlineData(-6)]
    [InlineData(-3)]
    [InlineData(0)]
    [InlineData(2)]
    [InlineData(6)]
    public void Score_PlannedWithinExclusionWindow_ExcludesRecipe(int dayOffset)
    {
        var result = Score(Target, [Candidate(1, "Pasta", [Target.AddDays(dayOffset)])]);

        Assert.Empty(result);
    }

    [Fact]
    public void Score_PlannedJustOutsideExclusionWindow_IncludesRecipe()
    {
        var result = Score(Target, [
            Candidate(1, "Past", [Target.AddDays(-7)]),
            Candidate(2, "Future", [Target.AddDays(7)])]);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void Score_LongerRestedRecipe_ScoresHigherOnRotation()
    {
        var result = Score(Target, [
            Candidate(1, "Recent", [Target.AddDays(-14)]),
            Candidate(2, "Rested", [Target.AddDays(-56)])]);

        Assert.Equal("Rested", result[0].Name);
        Assert.True(result[0].Score > result[1].Score);
    }

    [Fact]
    public void Score_RotationSaturates_AtSaturationDays()
    {
        var result = Score(Target, [
            Candidate(1, "AtSaturation", [Target.AddDays(-84)]),
            Candidate(2, "BeyondSaturation", [Target.AddDays(-120)])]);

        Assert.Equal(result[0].Score, result[1].Score, 6);
    }

    [Fact]
    public void Score_NeverPlanned_GetsBaselineAndReason()
    {
        var result = Score(Target, [
            Candidate(1, "Fresh", [Target.AddDays(-14)]),
            Candidate(2, "New"),
            Candidate(3, "Rested", [Target.AddDays(-84)])]);

        Assert.Equal(new[] { "Rested", "New", "Fresh" }, result.Select(s => s.Name));
        var newRecipe = result.Single(s => s.Name == "New");
        Assert.Contains("Not planned yet", newRecipe.Reasons);
        Assert.Null(newRecipe.LastPlannedOn);
    }

    [Fact]
    public void Score_Favorites_SaturatesAtCap()
    {
        // Same last-planned date; historical dates in January so seasonality never triggers for a July target.
        static List<DateOnly> JanuaryPlans(int count)
        {
            var dates = new List<DateOnly> { Target.AddDays(-100) };
            for (var i = 0; i < count - 1; i++)
                dates.Add(new DateOnly(2020 + (i / 20), 1, 1 + (i % 20)));
            return dates;
        }

        var result = Score(Target, [
            Candidate(1, "EightPlans", JanuaryPlans(8)),
            Candidate(2, "TwentyPlans", JanuaryPlans(20))]);

        Assert.Equal(result[0].Score, result[1].Score, 6);
    }

    [Fact]
    public void Score_FavoritesReason_OnlyFromThreePlans()
    {
        var twoPlans = Score(Target, [Candidate(1, "Two", [Target.AddDays(-100), Target.AddDays(-130)])]).Single();
        var threePlans = Score(Target, [Candidate(1, "Three", [Target.AddDays(-100), Target.AddDays(-130), Target.AddDays(-160)])]).Single();

        Assert.DoesNotContain(twoPlans.Reasons, r => r.StartsWith("Planned"));
        Assert.Contains("Planned 3 times", threePlans.Reasons);
    }

    [Fact]
    public void Score_PlansSameTimeOfYearInPriorYears_BoostSeasonality()
    {
        var result = Score(Target, [
            Candidate(1, "Seasonal", [new DateOnly(2024, 7, 10), new DateOnly(2025, 7, 20)]),
            Candidate(2, "OffSeason", [new DateOnly(2024, 1, 10), new DateOnly(2025, 1, 20)])]);

        var seasonal = result.Single(s => s.Name == "Seasonal");
        var offSeason = result.Single(s => s.Name == "OffSeason");
        Assert.True(seasonal.Score > offSeason.Score);
        Assert.Contains("Often planned in July", seasonal.Reasons);
        Assert.DoesNotContain(offSeason.Reasons, r => r.StartsWith("Often planned"));
    }

    [Fact]
    public void Score_RecentPlans_DoNotCountAsSeasonal()
    {
        // 14 days before the target: inside the seasonal day-of-year window but far too recent.
        var result = Score(Target, [Candidate(1, "Recent", [Target.AddDays(-14)])]).Single();

        Assert.DoesNotContain(result.Reasons, r => r.StartsWith("Often planned"));
    }

    [Fact]
    public void Score_Seasonality_WrapsAroundYearBoundary()
    {
        var januaryTarget = new DateOnly(2027, 1, 3);
        var priorYearPlans = new List<DateOnly>
        {
            new(2024, 12, 30), new(2025, 1, 5), new(2025, 12, 28)
        };
        var result = Score(januaryTarget, [Candidate(1, "NewYearsDish", priorYearPlans)]).Single();

        Assert.Contains("Often planned in January", result.Reasons);
    }

    [Fact]
    public void Score_HolidayTag_OnlyBoostsInConfiguredMonths()
    {
        var rules = new List<SeasonalTagRule> { Rule("jul", MonthMask(12), 15) };
        var decemberTarget = new DateOnly(2026, 12, 15);

        var december = Score(decemberTarget, [Candidate(1, "Flæskesteg", tags: ["jul"]), Candidate(2, "Plain")], rules: rules);
        var july = Score(Target, [Candidate(1, "Flæskesteg", tags: ["jul"]), Candidate(2, "Plain")], rules: rules);

        Assert.Equal(15, december.Single(s => s.Name == "Flæskesteg").Score - december.Single(s => s.Name == "Plain").Score, 6);
        Assert.Equal(july.Single(s => s.Name == "Flæskesteg").Score, july.Single(s => s.Name == "Plain").Score, 6);
        Assert.Contains("Matches 'jul'", december.Single(s => s.Name == "Flæskesteg").Reasons);
    }

    [Fact]
    public void Score_ExactKeyword_DoesNotMatchLongerTag()
    {
        var rules = new List<SeasonalTagRule> { Rule("jul", MonthMask(12), 15) };
        var decemberTarget = new DateOnly(2026, 12, 15);

        var result = Score(decemberTarget, [Candidate(1, "JulyDish", tags: ["juli"]), Candidate(2, "Plain")], rules: rules);

        Assert.Equal(result.Single(s => s.Name == "JulyDish").Score, result.Single(s => s.Name == "Plain").Score, 6);
    }

    [Fact]
    public void Score_PrefixKeyword_MatchesCompoundTags()
    {
        var rules = new List<SeasonalTagRule> { Rule("jule", MonthMask(12), 15, matchPrefix: true) };
        var decemberTarget = new DateOnly(2026, 12, 15);

        var result = Score(decemberTarget, [Candidate(1, "Frokost", tags: ["julefrokost"])], rules: rules).Single();

        Assert.Contains("Matches 'jule'", result.Reasons);
    }

    [Fact]
    public void Score_SeasonTag_BoostsBySeasonRuleAmount()
    {
        var rules = new List<SeasonalTagRule> { Rule("sommer", MonthMask(6, 7, 8), 10) };

        var result = Score(Target, [Candidate(1, "Salat", tags: ["Sommer"]), Candidate(2, "Plain")], rules: rules);

        Assert.Equal(10, result.Single(s => s.Name == "Salat").Score - result.Single(s => s.Name == "Plain").Score, 6);
    }

    [Fact]
    public void Score_MultipleMatchingRules_TakesMaxNotSum()
    {
        var december = MonthMask(12);
        var rules = new List<SeasonalTagRule> { Rule("jul", december, 15), Rule("vinter", december, 10) };
        var decemberTarget = new DateOnly(2026, 12, 15);

        var result = Score(decemberTarget, [Candidate(1, "Both", tags: ["jul", "vinter"]), Candidate(2, "Plain")], rules: rules);

        Assert.Equal(15, result.Single(s => s.Name == "Both").Score - result.Single(s => s.Name == "Plain").Score, 6);
    }

    [Fact]
    public void Score_ExclusionWindowOption_IsRespected()
    {
        var candidate = Candidate(1, "Pasta", [Target.AddDays(-10)]);

        var defaultWindow = Score(Target, [candidate]);
        var twoWeekWindow = Score(Target, [candidate], new SuggestionScoringOptions(ExclusionWindowDays: 13));

        Assert.Single(defaultWindow);
        Assert.Empty(twoWeekWindow);
    }

    [Fact]
    public void Score_WeightOptions_AreRespected()
    {
        var result = Score(Target, [Candidate(1, "New")], new SuggestionScoringOptions(RotationWeight: 0)).Single();

        Assert.Equal(0, result.Score, 6);
    }

    [Fact]
    public void Score_EqualScores_TieBreakByName()
    {
        var result = Score(Target, [Candidate(2, "banana"), Candidate(1, "Apple")]);

        Assert.Equal(new[] { "Apple", "banana" }, result.Select(s => s.Name));
    }

    [Fact]
    public void Score_NeverPlanned_RanksAboveMoreRecentlyPlannedOnTie()
    {
        // Never-planned sorts before planned when scores are equal.
        var options = new SuggestionScoringOptions(RotationWeight: 0, FavoritesWeight: 0, SeasonalityWeight: 0);
        var result = Score(Target, [Candidate(1, "Planned", [Target.AddDays(-30)]), Candidate(2, "Never")], options);

        Assert.Equal(new[] { "Never", "Planned" }, result.Select(s => s.Name));
    }

    [Fact]
    public void Score_Reasons_AtMostTwoAndOrderedByContribution()
    {
        // Rotation 40 (saturated), favorites 25 (8 plans), seasonality > 0 — only the top two shown.
        var dates = new List<DateOnly>
        {
            Target.AddDays(-90),
            new(2024, 7, 12), new(2024, 7, 19), new(2025, 7, 13),
            new(2023, 1, 5), new(2023, 2, 5), new(2023, 3, 5), new(2022, 5, 5)
        };
        var result = Score(Target, [Candidate(1, "Favorite", dates)]).Single();

        Assert.Equal(2, result.Reasons.Count);
        Assert.StartsWith("Last planned", result.Reasons[0]);
        Assert.Equal("Planned 8 times", result.Reasons[1]);
    }

    [Fact]
    public void Score_LastPlannedReason_UsesDaysThenWeeks()
    {
        var days = Score(Target, [Candidate(1, "Days", [Target.AddDays(-10)])]).Single();
        var weeks = Score(Target, [Candidate(1, "Weeks", [Target.AddDays(-35)])]).Single();

        Assert.Contains("Last planned 10 days ago", days.Reasons);
        Assert.Contains("Last planned 5 weeks ago", weeks.Reasons);
    }

    [Fact]
    public void Score_MapsLastPlannedOnAndTimesPlanned()
    {
        var result = Score(Target, [Candidate(1, "Pasta", [Target.AddDays(-30), Target.AddDays(-60)])]).Single();

        Assert.Equal(Target.AddDays(-30), result.LastPlannedOn);
        Assert.Equal(2, result.TimesPlanned);
    }
}
