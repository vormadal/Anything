using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record ApproveRecommendationCommand(int Id) : IRequest<IResult>;

public class ApproveRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IUnitOfWork unitOfWork)
    : IRequestHandler<ApproveRecommendationCommand, IResult>
{
    private const string RecommendationNotFound = "Recommendation not found.";

    public async Task<IResult> Handle(ApproveRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.GetById(command.Id);
        if (recommendation is null || recommendation.DeletedOn != null)
            return Results.NotFound(RecommendationNotFound);

        recommendation.IsApproved = true;
        recommendation.ModifiedOn = DateTime.UtcNow;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
