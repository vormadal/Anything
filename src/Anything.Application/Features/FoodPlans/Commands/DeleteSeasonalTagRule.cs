using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record DeleteSeasonalTagRuleCommand(int RuleId) : IRequest<IResult>;

public class DeleteSeasonalTagRuleHandler(
    IRepository<SeasonalTagRule> ruleRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteSeasonalTagRuleCommand, IResult>
{
    private const string RuleNotFound = "Seasonal tag rule not found.";

    public async Task<IResult> Handle(DeleteSeasonalTagRuleCommand command, CancellationToken ct = default)
    {
        var rule = await ruleRepository.Query()
            .FirstOrDefaultAsync(r => r.Id == command.RuleId && r.DeletedOn == null
                && r.HouseholdId == householdContext.HouseholdId, ct);
        if (rule is null)
            return Results.NotFound(RuleNotFound);

        rule.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        ruleRepository.Update(rule);
        await unitOfWork.SaveChanges(ct);

        return Results.NoContent();
    }
}
