namespace Anything.Core.Entities;

public class FoodPlanSettings
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    /// <summary>
    /// Bitmask of active days: bit 0 = Monday, bit 1 = Tuesday, ..., bit 6 = Sunday.
    /// Default 31 (0b0011111) = Monday–Friday.
    /// </summary>
    public int ActiveDays { get; set; } = 31;
    /// <summary>
    /// Maximum suggestion points awarded for not having planned a recipe recently.
    /// </summary>
    public int SuggestionRotationWeight { get; set; } = 40;
    /// <summary>
    /// Maximum suggestion points awarded for how often a recipe has been planned overall.
    /// </summary>
    public int SuggestionFavoritesWeight { get; set; } = 25;
    /// <summary>
    /// Maximum suggestion points awarded for recipes planned around the same time of year in previous years.
    /// </summary>
    public int SuggestionSeasonalityWeight { get; set; } = 20;
    /// <summary>
    /// Recipes planned within this many days (before or after) of the target date are excluded from suggestions.
    /// </summary>
    public int SuggestionExclusionWindowDays { get; set; } = 6;
    /// <summary>
    /// Days since last planned at which the rotation signal reaches its maximum.
    /// </summary>
    public int SuggestionRotationSaturationDays { get; set; } = 84;
    /// <summary>
    /// Maximum day-of-year distance for a historical plan to count as seasonal.
    /// </summary>
    public int SuggestionSeasonalityWindowDays { get; set; } = 21;
    /// <summary>
    /// Set when the default seasonal tag rules have been seeded for this household.
    /// </summary>
    public DateTime? SeasonalTagsSeededOn { get; set; }
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
}
