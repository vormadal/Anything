using Anything.Contracts.Recommendations;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

/// <summary>
/// Moves every suggestion from one scope to another in bulk (e.g. all shared suggestions
/// onto a single list). A null list id means the shared scope. When a moved suggestion's
/// name already exists in the destination scope, the source row is dropped instead of
/// moved — the destination's existing suggestion wins — so the source scope is fully
/// emptied without violating the (HouseholdId, ShoppingListId, Name) unique index.
/// </summary>
public record TransferRecommendationsCommand(int? FromShoppingListId, int? ToShoppingListId)
    : IRequest<IResult>;

public class TransferRecommendationsHandler(
    IRepository<ShoppingListRecommendation> repository,
    IRepository<ShoppingList> listRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<TransferRecommendationsCommand, IResult>
{
    public async Task<IResult> Handle(TransferRecommendationsCommand command, CancellationToken ct = default)
    {
        if (command.FromShoppingListId == command.ToShoppingListId)
            return Results.BadRequest(RecommendationErrors.TransferSameScope);

        var householdId = householdContext.HouseholdId;

        if (!await RecommendationListValidation.ListBelongsToHousehold(listRepository, command.FromShoppingListId, householdId, ct))
            return Results.NotFound(RecommendationErrors.ListNotFound);
        if (!await RecommendationListValidation.ListBelongsToHousehold(listRepository, command.ToShoppingListId, householdId, ct))
            return Results.NotFound(RecommendationErrors.ListNotFound);

        var sources = await repository.Query()
            .Where(r => r.HouseholdId == householdId && r.ShoppingListId == command.FromShoppingListId)
            .ToListAsync(ct);

        // Names already present in the destination scope. Matched case-insensitively,
        // mirroring ShoppingListHelpers.GetExistingRecommendationNames, so a collision is
        // caught before it can trip the partial unique index.
        var destinationNames = await repository.Query()
            .Where(r => r.HouseholdId == householdId && r.ShoppingListId == command.ToShoppingListId)
            .Select(r => r.Name.ToLower())
            .ToHashSetAsync(ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var moved = 0;
        var dropped = 0;

        foreach (var source in sources)
        {
            if (destinationNames.Contains(source.Name.ToLower()))
            {
                repository.Remove(source);
                dropped++;
            }
            else
            {
                source.ShoppingListId = command.ToShoppingListId;
                source.ModifiedOn = now;
                moved++;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.Ok(new TransferRecommendationsResponse(moved, dropped));
    }
}
