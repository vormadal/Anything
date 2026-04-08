using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

public record ApproveRecommendationCommand(int Id) : IRequest<IResult>;

public class ApproveRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<ApproveRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(ApproveRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.Query()
            .Where(r => r.Id == command.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recommendation is null)
            return Results.NotFound(RecommendationErrors.NotFound);

        recommendation.IsApproved = true;
        recommendation.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
