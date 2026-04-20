using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

public record DeleteRecommendationCommand(int Id) : IRequest<IResult>;

public class DeleteRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.Query()
            .Where(r => r.Id == command.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recommendation is null)
            return Results.NotFound(RecommendationErrors.NotFound);

        recommendation.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
