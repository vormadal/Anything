using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListItemsQuery(int ShoppingListId) : IRequest<IResult>;

public class GetShoppingListItemsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IRepository<SuggestionCategory> categoryRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetShoppingListItemsQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListItemsQuery query, CancellationToken ct = default)
    {
        var list = await listRepository.Query().AsNoTracking()
            .Where(l => l.Id == query.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound("Shopping list not found.");

        List<ShoppingListItem> items;
        if (list.Type == ListType.General)
        {
            items = await itemRepository.Query().AsNoTracking()
                .Where(item => item.ShoppingListId == query.ShoppingListId && item.CompletedOn == null)
                .OrderBy(item => item.IsChecked)
                .ThenBy(item => item.SortOrder)
                .ThenBy(item => item.CreatedOn)
                .ToListAsync(ct);
        }
        else
        {
            var householdId = householdContext.HouseholdId;
            var listItems = await itemRepository.Query().AsNoTracking()
                .Where(item => item.ShoppingListId == query.ShoppingListId && item.CompletedOn == null)
                .ToListAsync(ct);

            // Names can now match both a shared (null-list) and this list's own recommendation,
            // so resolve a single category per name in memory (preferring the list-specific one)
            // instead of joining — a SQL join would duplicate the item row.
            var relevantRecs = await recommendationRepository.Query().AsNoTracking()
                .Where(r => r.HouseholdId == householdId
                            && r.CategoryId != null
                            && (r.ShoppingListId == query.ShoppingListId || r.ShoppingListId == null))
                .Select(r => new { r.Name, r.ShoppingListId, r.CategoryId })
                .ToListAsync(ct);

            var categorySortOrders = await categoryRepository.Query().AsNoTracking()
                .Where(c => c.DeletedOn == null && c.HouseholdId == householdId)
                .ToDictionaryAsync(c => c.Id, c => c.SortOrder, ct);

            var sortOrderByName = relevantRecs
                .GroupBy(r => r.Name.ToLower())
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        // List-specific wins over shared when both carry a category.
                        var best = g.OrderByDescending(r => r.ShoppingListId != null).First();
                        return best.CategoryId is int categoryId && categorySortOrders.TryGetValue(categoryId, out var sortOrder)
                            ? (int?)sortOrder
                            : null;
                    });

            // Uncategorized items sort last, matching the previous SQL ordering (Postgres NULLS LAST).
            items = listItems
                .OrderBy(item => item.IsChecked)
                .ThenBy(item => sortOrderByName.TryGetValue(item.Name.ToLower(), out var sortOrder) && sortOrder.HasValue
                    ? sortOrder.Value
                    : int.MaxValue)
                .ThenBy(item => item.CreatedOn)
                .ToList();
        }

        return Results.Ok(items);
    }
}
