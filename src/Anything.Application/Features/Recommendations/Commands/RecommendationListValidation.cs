using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

internal static class RecommendationListValidation
{
    /// <summary>
    /// Returns true when <paramref name="shoppingListId"/> is a live list owned by the household.
    /// A null list id is always valid — it means the suggestion is shared across all lists.
    /// </summary>
    internal static async Task<bool> ListBelongsToHousehold(
        IRepository<ShoppingList> listRepository,
        int? shoppingListId,
        int householdId,
        CancellationToken ct)
    {
        if (shoppingListId is null)
            return true;

        return await listRepository.Query()
            .AnyAsync(l => l.Id == shoppingListId && l.DeletedOn == null && l.HouseholdId == householdId, ct);
    }
}
