using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record CreateRecommendationCommand(string Name, string? PreferredUnit) : IRequest<IResult>;

public class CreateRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(CreateRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = new ShoppingListRecommendation
        {
            Name = command.Name,
            PreferredUnit = command.PreferredUnit,
            IsApproved = true,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(recommendation);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/shopping-list-recommendations/{recommendation.Id}", recommendation);
    }
}
