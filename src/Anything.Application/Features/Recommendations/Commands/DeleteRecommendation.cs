using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record DeleteRecommendationCommand(int Id) : IRequest<IResult>;

public class DeleteRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteRecommendationCommand, IResult>
{
    private const string RecommendationNotFound = "Recommendation not found.";

    public async Task<IResult> Handle(DeleteRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.GetById(command.Id);
        if (recommendation is null || recommendation.DeletedOn != null)
            return Results.NotFound(RecommendationNotFound);

        recommendation.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
