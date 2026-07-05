using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.FoodPlans.Queries;

public record GetSeasonalTagRulesQuery : IRequest<List<SeasonalTagRuleResponse>>;

public class GetSeasonalTagRulesHandler(
    IRepository<SeasonalTagRule> ruleRepository,
    IRepository<FoodPlanSettings> settingsRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<GetSeasonalTagRulesQuery, List<SeasonalTagRuleResponse>>
{
    public async Task<List<SeasonalTagRuleResponse>> Handle(GetSeasonalTagRulesQuery query, CancellationToken ct = default)
    {
        var rules = await SeasonalTagDefaults.GetOrSeedRules(
            ruleRepository, settingsRepository, householdContext, unitOfWork, timeProvider, ct);

        return rules
            .Select(r => new SeasonalTagRuleResponse(r.Id, r.Keyword, r.MatchPrefix, r.Months, r.Boost))
            .ToList();
    }
}
