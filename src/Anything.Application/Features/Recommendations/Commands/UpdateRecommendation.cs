using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record UpdateRecommendationCommand(int Id, string Name, string? PreferredUnit) : IRequest<IResult>;

public class UpdateRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateRecommendationCommand, IResult>
{
    private const string RecommendationNotFound = "Recommendation not found.";

    public async Task<IResult> Handle(UpdateRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.GetById(command.Id);
        if (recommendation is null || recommendation.DeletedOn != null)
            return Results.NotFound(RecommendationNotFound);

        recommendation.Name = command.Name;
        recommendation.PreferredUnit = command.PreferredUnit;
        recommendation.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
