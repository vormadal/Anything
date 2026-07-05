namespace Anything.Core.Entities;

public class SeasonalTagRule
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    /// <summary>
    /// Normalized lowercase keyword matched against recipe tag names, e.g. "jul" or "sommer".
    /// </summary>
    public required string Keyword { get; set; }
    /// <summary>
    /// When true, a recipe tag matches if it starts with <see cref="Keyword"/>; otherwise only an exact match counts.
    /// </summary>
    public bool MatchPrefix { get; set; }
    /// <summary>
    /// Bitmask of months the rule applies to: bit 0 = January, ..., bit 11 = December.
    /// </summary>
    public int Months { get; set; }
    /// <summary>
    /// Points added to a recipe's suggestion score when the rule matches (the highest matching rule wins).
    /// </summary>
    public int Boost { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
