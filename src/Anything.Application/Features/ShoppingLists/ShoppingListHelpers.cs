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
        DateTime createdOn,
        bool includeInSuggestions = true)
    {
        var nameKey = name.ToLower();
        if (!existingNames.Contains(nameKey))
        {
            repository.Add(new ShoppingListRecommendation
            {
                HouseholdId = householdId,
                Name = name,
                IncludeInSuggestions = includeInSuggestions,
                CreatedOn = createdOn
            });
            existingNames.Add(nameKey);
        }
    }

    internal static async Task<int> GetNextListSortOrder(
        IRepository<ShoppingList> repository,
        int householdId,
        bool isTemplate,
        CancellationToken ct)
    {
        var max = await repository.Query()
            .Where(l => l.DeletedOn == null && l.IsTemplate == isTemplate && l.HouseholdId == householdId)
            .Select(l => (int?)l.SortOrder)
            .MaxAsync(ct);
        return (max ?? -1) + 1;
    }

    internal static List<ShoppingListItem> CopyItems(
        IEnumerable<ShoppingListItem> source,
        int targetListId,
        DateTime now)
    {
        return source
            .OrderBy(i => i.SortOrder)
            .Select((i, index) => new ShoppingListItem
            {
                ShoppingListId = targetListId,
                SortOrder = index,
                Name = i.Name,
                Amount = i.Amount,
                Unit = i.Unit,
                IsChecked = false,
                CreatedOn = now
            })
            .ToList();
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
