using System.Globalization;
using Anything.Core.Entities;

namespace Anything.Application.Features.FoodPlans;

/// <summary>
/// Per-household tuning values for the suggestion engine, mirrored by columns on <see cref="FoodPlanSettings"/>.
/// </summary>
public record SuggestionScoringOptions(
    int RotationWeight = 40,
    int FavoritesWeight = 25,
    int SeasonalityWeight = 20,
    int ExclusionWindowDays = 6,
    int RotationSaturationDays = 84,
    int SeasonalityWindowDays = 21)
{
    public static SuggestionScoringOptions Default { get; } = new();

    public static SuggestionScoringOptions FromSettings(FoodPlanSettings? settings) =>
        settings is null
            ? Default
            : new SuggestionScoringOptions(
                settings.SuggestionRotationWeight,
                settings.SuggestionFavoritesWeight,
                settings.SuggestionSeasonalityWeight,
                settings.SuggestionExclusionWindowDays,
                settings.SuggestionRotationSaturationDays,
                settings.SuggestionSeasonalityWindowDays);
}

public record SuggestionCandidate(
    int RecipeId,
    string Name,
    IReadOnlyList<DateOnly> PlannedDates,
    IReadOnlyList<string> Tags);

public record ScoredSuggestion(
    int RecipeId,
    string Name,
    double Score,
    List<string> Reasons,
    DateOnly? LastPlannedOn,
    int TimesPlanned);

/// <summary>
/// Pure suggestion scoring engine: no clock, no database — everything is derived from
/// the target date, the candidates' planning history/tags, the household's tuning options
/// and its seasonal tag rules.
/// </summary>
public static class FoodPlanSuggestionScorer
{
    // Number of plans at which the favorites signal reaches its maximum.
    private const int FavoritesSaturationCount = 8;
    // Number of matching prior-year plans at which the seasonality signal reaches its maximum.
    private const int SeasonalitySaturationCount = 3;
    // Plans must be at least this old to count as "previous years" for seasonality,
    // so recent plans aren't double-counted by both rotation and seasonality.
    private const int SeasonalityLookbackMinDays = 300;
    // Fraction of the rotation weight granted to recipes that have never been planned.
    private const double NeverPlannedRotationFactor = 0.7;
    // A secondary reason is only shown when its signal contributed at least this many points.
    private const double SecondReasonMinPoints = 8;
    // The "Planned {n} times" reason is only shown from this many plans.
    private const int FavoriteReasonMinCount = 3;
    private const int DaysPerWeek = 7;
    private const int DaysPerYear = 365;

    public static List<ScoredSuggestion> Score(
        DateOnly targetDate,
        IEnumerable<SuggestionCandidate> candidates,
        SuggestionScoringOptions options,
        IReadOnlyList<SeasonalTagRule> seasonalTagRules)
    {
        var monthBit = 1 << (targetDate.Month - 1);
        var activeRules = seasonalTagRules
            .Where(r => (r.Months & monthBit) != 0)
            .Select(r => new ActiveRule(Normalize(r.Keyword), r.MatchPrefix, r.Boost))
            .Where(r => r.Keyword.Length > 0)
            .ToList();

        var scored = new List<ScoredSuggestion>();
        foreach (var candidate in candidates)
        {
            var suggestion = ScoreCandidate(targetDate, candidate, options, activeRules);
            if (suggestion is not null)
                scored.Add(suggestion);
        }

        return scored
            .OrderByDescending(s => s.Score)
            .ThenBy(s => s.LastPlannedOn.HasValue ? 1 : 0)
            .ThenBy(s => s.LastPlannedOn)
            .ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private sealed record ActiveRule(string Keyword, bool MatchPrefix, int Boost);

    private static ScoredSuggestion? ScoreCandidate(
        DateOnly targetDate,
        SuggestionCandidate candidate,
        SuggestionScoringOptions options,
        List<ActiveRule> activeRules)
    {
        var plannedWithinWindow = candidate.PlannedDates
            .Any(d => Math.Abs(d.DayNumber - targetDate.DayNumber) <= options.ExclusionWindowDays);
        if (plannedWithinWindow)
            return null;

        var contributions = new List<(double Points, string Reason)>();

        var pastDates = candidate.PlannedDates.Where(d => d <= targetDate).ToList();
        DateOnly? lastPlannedOn = pastDates.Count > 0 ? pastDates.Max() : null;
        var timesPlanned = candidate.PlannedDates.Count;

        double rotation;
        if (lastPlannedOn.HasValue)
        {
            var daysSince = targetDate.DayNumber - lastPlannedOn.Value.DayNumber;
            var saturation = Math.Max(1, options.RotationSaturationDays);
            rotation = options.RotationWeight * Math.Min(daysSince, saturation) / (double)saturation;
            contributions.Add((rotation, FormatLastPlanned(daysSince)));
        }
        else
        {
            rotation = options.RotationWeight * NeverPlannedRotationFactor;
            contributions.Add((rotation, "Not planned yet"));
        }

        var favorites = options.FavoritesWeight
            * Math.Min(timesPlanned, FavoritesSaturationCount) / (double)FavoritesSaturationCount;
        if (timesPlanned >= FavoriteReasonMinCount)
            contributions.Add((favorites, $"Planned {timesPlanned} times"));

        var seasonalCount = candidate.PlannedDates.Count(d =>
            targetDate.DayNumber - d.DayNumber > SeasonalityLookbackMinDays &&
            CircularDayOfYearDistance(d, targetDate) <= options.SeasonalityWindowDays);
        var seasonality = options.SeasonalityWeight
            * Math.Min(seasonalCount, SeasonalitySaturationCount) / (double)SeasonalitySaturationCount;
        if (seasonalCount > 0)
        {
            var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(targetDate.Month);
            contributions.Add((seasonality, $"Often planned in {monthName}"));
        }

        var normalizedTags = candidate.Tags.Select(Normalize).Where(t => t.Length > 0).Distinct().ToList();
        var matchedRule = activeRules
            .Where(r => normalizedTags.Any(t => t == r.Keyword || (r.MatchPrefix && t.StartsWith(r.Keyword))))
            .OrderByDescending(r => r.Boost)
            .FirstOrDefault();
        var tagBoost = matchedRule?.Boost ?? 0;
        if (matchedRule is not null && tagBoost > 0)
            contributions.Add((tagBoost, $"Matches '{matchedRule.Keyword}'"));

        var reasons = contributions
            .OrderByDescending(c => c.Points)
            .Where((c, index) => index == 0 || (index == 1 && c.Points >= SecondReasonMinPoints))
            .Select(c => c.Reason)
            .ToList();

        return new ScoredSuggestion(
            candidate.RecipeId,
            candidate.Name,
            rotation + favorites + seasonality + tagBoost,
            reasons,
            lastPlannedOn,
            timesPlanned);
    }

    private static string FormatLastPlanned(int daysSince) =>
        daysSince < 2 * DaysPerWeek
            ? $"Last planned {daysSince} days ago"
            : $"Last planned {daysSince / DaysPerWeek} weeks ago";

    private static int CircularDayOfYearDistance(DateOnly a, DateOnly b)
    {
        var distance = Math.Abs(a.DayOfYear - b.DayOfYear);
        return Math.Min(distance, DaysPerYear - distance);
    }

    private static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
