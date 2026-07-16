using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

/// <summary>
/// Removes every suggestion that belongs specifically to <paramref name="ShoppingListId"/>.
/// Shared (null-list) suggestions are left untouched — they keep appearing in every list.
/// </summary>
public record DeleteRecommendationsForListCommand(int ShoppingListId) : IRequest<IResult>;

public class DeleteRecommendationsForListHandler(
    IRepository<ShoppingListRecommendation> repository,
    IRepository<ShoppingList> listRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteRecommendationsForListCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRecommendationsForListCommand command, CancellationToken ct = default)
    {
        if (!await RecommendationListValidation.ListBelongsToHousehold(listRepository, command.ShoppingListId, householdContext.HouseholdId, ct))
            return Results.NotFound(RecommendationErrors.ListNotFound);

        var recommendations = await repository.Query()
            .Where(r => r.HouseholdId == householdContext.HouseholdId && r.ShoppingListId == command.ShoppingListId)
            .ToListAsync(ct);

        foreach (var recommendation in recommendations)
            repository.Remove(recommendation);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
