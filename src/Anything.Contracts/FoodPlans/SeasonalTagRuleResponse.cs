namespace Anything.Contracts.FoodPlans;

public record SeasonalTagRuleResponse(
    int Id,
    string Keyword,
    bool MatchPrefix,
    int Months,
    int Boost);
