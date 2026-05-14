using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists;

internal static class ShoppingListHelpers
{
    internal static async Task<HashSet<string>> GetExistingRecommendationNamesAsync(
        IRepository<ShoppingListRecommendation> repository,
        int householdId,
        HashSet<string> namesLower,
        CancellationToken ct)
    {
        return await repository.Query()
            .Where(r => r.HouseholdId == householdId && namesLower.Contains(r.Name.ToLower()))
            .Select(r => r.Name.ToLower())
            .ToHashSetAsync(ct);
    }

    internal static void AddRecommendationIfNotExists(
        IRepository<ShoppingListRecommendation> repository,
        HashSet<string> existingNames,
        int householdId,
        string name,
        DateTime createdOn)
    {
        var nameKey = name.ToLower();
        if (!existingNames.Contains(nameKey))
        {
            repository.Add(new ShoppingListRecommendation
            {
                HouseholdId = householdId,
                Name = name,
                CreatedOn = createdOn
            });
            existingNames.Add(nameKey);
        }
    }

    internal static void MergeOrAddItem(
        IRepository<ShoppingListItem> repository,
        List<ShoppingListItem> existingItems,
        int shoppingListId,
        string name,
        decimal? amount,
        string? unit,
        string? addedByRecipe,
        DateTime now)
    {
        var nameKey = name.ToLower();
        var unitKey = (unit ?? "").ToLower();
        var existing = existingItems.FirstOrDefault(i =>
            i.Name.Trim().ToLower() == nameKey &&
            (i.Unit ?? "").Trim().ToLower() == unitKey &&
            i.AddedByRecipe == addedByRecipe &&
            !i.IsChecked);

        if (existing != null)
        {
            existing.Amount = amount == null ? existing.Amount : (existing.Amount ?? 0) + amount;
            existing.ModifiedOn = now;
            repository.Update(existing);
        }
        else
        {
            repository.Add(new ShoppingListItem
            {
                ShoppingListId = shoppingListId,
                Name = name,
                Amount = amount,
                Unit = unit,
                AddedByRecipe = addedByRecipe,
                CreatedOn = now
            });
        }
    }
}
