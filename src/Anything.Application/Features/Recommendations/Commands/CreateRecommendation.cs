using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recommendations.Commands;

public record CreateRecommendationCommand(string Name, string? PreferredUnit, int? ShoppingListId = null) : IRequest<IResult>;

public class CreateRecommendationHandler(
    IRepository<ShoppingListRecommendation> repository,
    IRepository<ShoppingList> listRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<CreateRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(CreateRecommendationCommand command, CancellationToken ct = default)
    {
        if (!await RecommendationListValidation.ListBelongsToHousehold(listRepository, command.ShoppingListId, householdContext.HouseholdId, ct))
            return Results.NotFound(RecommendationErrors.ListNotFound);

        var recommendation = new ShoppingListRecommendation
        {
            HouseholdId = householdContext.HouseholdId,
            ShoppingListId = command.ShoppingListId,
            Name = command.Name,
            PreferredUnit = command.PreferredUnit,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(recommendation);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/shopping-list-recommendations/{recommendation.Id}", recommendation);
    }
}
