using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record CreateRecommendationCommand(string Name, string? PreferredUnit) : IRequest<IResult>;

public class CreateRecommendationHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(CreateRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = new ShoppingListRecommendation
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            PreferredUnit = command.PreferredUnit,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(recommendation);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/shopping-list-recommendations/{recommendation.Id}", recommendation);
    }
}
