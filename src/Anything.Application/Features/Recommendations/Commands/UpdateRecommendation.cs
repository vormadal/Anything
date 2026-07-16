using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

public record UpdateRecommendationCommand(int Id, string Name, string? PreferredUnit, int? CategoryId, bool IncludeInSuggestions = true, int? ShoppingListId = null) : IRequest<IResult>;

public class UpdateRecommendationHandler(
    IRepository<ShoppingListRecommendation> repository,
    IRepository<ShoppingList> listRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateRecommendationCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRecommendationCommand command, CancellationToken ct = default)
    {
        var recommendation = await repository.Query()
            .Where(r => r.Id == command.Id && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (recommendation is null)
            return Results.NotFound(RecommendationErrors.NotFound);

        if (!await RecommendationListValidation.ListBelongsToHousehold(listRepository, command.ShoppingListId, householdContext.HouseholdId, ct))
            return Results.NotFound(RecommendationErrors.ListNotFound);

        recommendation.Name = command.Name;
        recommendation.PreferredUnit = command.PreferredUnit;
        recommendation.CategoryId = command.CategoryId;
        recommendation.IncludeInSuggestions = command.IncludeInSuggestions;
        recommendation.ShoppingListId = command.ShoppingListId;
        recommendation.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
