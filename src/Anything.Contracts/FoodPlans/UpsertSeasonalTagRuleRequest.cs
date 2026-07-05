using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.FoodPlans;

public record UpsertSeasonalTagRuleRequest(
    [Required]
    [MaxLength(50)]
    string Keyword,
    bool MatchPrefix,
    [Range(1, 4095, ErrorMessage = "Months must have at least one month selected (value between 1 and 4095).")]
    int Months,
    [Range(0, 50)]
    int Boost);
