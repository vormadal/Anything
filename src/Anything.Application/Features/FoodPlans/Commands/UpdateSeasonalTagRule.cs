using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateSeasonalTagRuleCommand(int RuleId, string Keyword, bool MatchPrefix, int Months, int Boost) : IRequest<IResult>;

public class UpdateSeasonalTagRuleHandler(
    IRepository<SeasonalTagRule> ruleRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateSeasonalTagRuleCommand, IResult>
{
    private const string RuleNotFound = "Seasonal tag rule not found.";

    public async Task<IResult> Handle(UpdateSeasonalTagRuleCommand command, CancellationToken ct = default)
    {
        var keyword = command.Keyword.Trim().ToLowerInvariant();
        if (keyword.Length == 0)
            return Results.BadRequest("Keyword must not be empty.");

        var rule = await ruleRepository.Query()
            .FirstOrDefaultAsync(r => r.Id == command.RuleId && r.DeletedOn == null
                && r.HouseholdId == householdContext.HouseholdId, ct);
        if (rule is null)
            return Results.NotFound(RuleNotFound);

        rule.Keyword = keyword;
        rule.MatchPrefix = command.MatchPrefix;
        rule.Months = command.Months;
        rule.Boost = command.Boost;
        rule.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        ruleRepository.Update(rule);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new SeasonalTagRuleResponse(rule.Id, rule.Keyword, rule.MatchPrefix, rule.Months, rule.Boost));
    }
}
