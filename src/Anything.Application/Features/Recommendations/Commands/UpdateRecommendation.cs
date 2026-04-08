using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

public record UpdateRecommendationCommand(int Id, string Name, string? PreferredUnit, int? CategoryId) : IRequest<IResult>;

public class UpdateRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.Query()
            .Where(r => r.Id == command.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recommendation is null)
            return Results.NotFound(RecommendationErrors.NotFound);

        recommendation.Name = command.Name;
        recommendation.PreferredUnit = command.PreferredUnit;
        recommendation.CategoryId = command.CategoryId;
        recommendation.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
