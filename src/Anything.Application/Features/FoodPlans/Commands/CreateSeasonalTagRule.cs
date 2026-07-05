using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.FoodPlans.Commands;

public record CreateSeasonalTagRuleCommand(string Keyword, bool MatchPrefix, int Months, int Boost) : IRequest<IResult>;

public class CreateSeasonalTagRuleHandler(
    IRepository<SeasonalTagRule> ruleRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateSeasonalTagRuleCommand, IResult>
{
    public async Task<IResult> Handle(CreateSeasonalTagRuleCommand command, CancellationToken ct = default)
    {
        var keyword = command.Keyword.Trim().ToLowerInvariant();
        if (keyword.Length == 0)
            return Results.BadRequest("Keyword must not be empty.");

        var rule = new SeasonalTagRule
        {
            HouseholdId = householdContext.HouseholdId,
            Keyword = keyword,
            MatchPrefix = command.MatchPrefix,
            Months = command.Months,
            Boost = command.Boost,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        ruleRepository.Add(rule);
        await unitOfWork.SaveChanges(ct);

        var response = new SeasonalTagRuleResponse(rule.Id, rule.Keyword, rule.MatchPrefix, rule.Months, rule.Boost);
        return Results.Created($"/api/food-plan/seasonal-tags/{rule.Id}", response);
    }
}
