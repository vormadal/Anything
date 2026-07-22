using Anything.Contracts.Search;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Search.Commands;

/// <summary>
/// Rebuilds every <see cref="SearchDocument"/> row from scratch across all
/// households. Safe to re-run: existing rows are updated in place and orphaned
/// ones (source entity deleted or no longer searchable) are removed. Intended
/// as an admin-only, on-demand operation — e.g. right after this feature ships,
/// to backfill existing data — not something run automatically on startup.
/// </summary>
public record RebuildSearchIndexCommand : IRequest<RebuildSearchIndexResponse>;

public class RebuildSearchIndexHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<InventoryItem> inventoryItemRepository,
    IRepository<SearchDocument> searchDocumentRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<RebuildSearchIndexCommand, RebuildSearchIndexResponse>
{
    public Task<RebuildSearchIndexResponse> Handle(RebuildSearchIndexCommand command, CancellationToken ct = default) =>
        SearchIndexRebuilder.Rebuild(
            recipeRepository, shoppingListRepository, inventoryItemRepository, searchDocumentRepository,
            unitOfWork, householdId: null, ct);
}

/// <summary>
/// Household-scoped variant of <see cref="RebuildSearchIndexCommand"/> — rebuilds
/// only the calling household's rows, so a household manager can self-serve a
/// reindex (e.g. to backfill data that existed before this feature shipped)
/// without needing the global admin role.
/// </summary>
public record RebuildHouseholdSearchIndexCommand : IRequest<RebuildSearchIndexResponse>;

public class RebuildHouseholdSearchIndexHandler(
    IRepository<Recipe> recipeRepository,
    IRepository<ShoppingList> shoppingListRepository,
    IRepository<InventoryItem> inventoryItemRepository,
    IRepository<SearchDocument> searchDocumentRepository,
    IUnitOfWork unitOfWork,
    IHouseholdContext householdContext)
    : IRequestHandler<RebuildHouseholdSearchIndexCommand, RebuildSearchIndexResponse>
{
    public Task<RebuildSearchIndexResponse> Handle(RebuildHouseholdSearchIndexCommand command, CancellationToken ct = default) =>
        SearchIndexRebuilder.Rebuild(
            recipeRepository, shoppingListRepository, inventoryItemRepository, searchDocumentRepository,
            unitOfWork, householdId: householdContext.HouseholdId, ct);
}

/// <summary>Shared rebuild logic behind <see cref="RebuildSearchIndexCommand"/> and <see cref="RebuildHouseholdSearchIndexCommand"/>.</summary>
internal static class SearchIndexRebuilder
{
    public static async Task<RebuildSearchIndexResponse> Rebuild(
        IRepository<Recipe> recipeRepository,
        IRepository<ShoppingList> shoppingListRepository,
        IRepository<InventoryItem> inventoryItemRepository,
        IRepository<SearchDocument> searchDocumentRepository,
        IUnitOfWork unitOfWork,
        int? householdId,
        CancellationToken ct)
    {
        var recipesQuery = recipeRepository.Query().Where(r => r.DeletedOn == null);
        var shoppingListsQuery = shoppingListRepository.Query().Where(l => l.DeletedOn == null);
        var inventoryItemsQuery = inventoryItemRepository.Query().Where(i => i.DeletedOn == null);
        var documentsQuery = searchDocumentRepository.Query();

        if (householdId.HasValue)
        {
            recipesQuery = recipesQuery.Where(r => r.HouseholdId == householdId);
            shoppingListsQuery = shoppingListsQuery.Where(l => l.HouseholdId == householdId);
            inventoryItemsQuery = inventoryItemsQuery.Where(i => i.HouseholdId == householdId);
            documentsQuery = documentsQuery.Where(d => d.HouseholdId == householdId);
        }

        var recipes = await recipesQuery.ToListAsync(ct);
        var shoppingLists = await shoppingListsQuery.ToListAsync(ct);
        var inventoryItems = await inventoryItemsQuery.ToListAsync(ct);

        var searchable = recipes.Cast<ISearchable>()
            .Concat(shoppingLists)
            .Concat(inventoryItems)
            .ToList();

        var existingDocuments = await documentsQuery.ToListAsync(ct);
        var existingByKey = existingDocuments.ToDictionary(d => (d.EntityType, d.EntityId));
        var liveKeys = new HashSet<(string EntityType, int EntityId)>();
        var now = DateTime.UtcNow;

        foreach (var entity in searchable)
        {
            var key = (entity.SearchEntityType, entity.SearchEntityId);
            liveKeys.Add(key);
            Upsert(searchDocumentRepository, existingByKey, key, entity, now);
        }

        foreach (var orphan in existingDocuments.Where(d => !liveKeys.Contains((d.EntityType, d.EntityId))))
            searchDocumentRepository.Remove(orphan);

        await unitOfWork.SaveChanges(ct);
        return new RebuildSearchIndexResponse(searchable.Count);
    }

    private static void Upsert(
        IRepository<SearchDocument> repository,
        Dictionary<(string EntityType, int EntityId), SearchDocument> existingByKey,
        (string EntityType, int EntityId) key,
        ISearchable entity,
        DateTime now)
    {
        if (existingByKey.TryGetValue(key, out var document))
        {
            document.HouseholdId = entity.HouseholdId;
            document.Title = entity.SearchTitle;
            document.Content = entity.SearchContent;
            document.ModifiedOn = now;
            return;
        }

        repository.Add(new SearchDocument
        {
            HouseholdId = entity.HouseholdId,
            EntityType = entity.SearchEntityType,
            EntityId = entity.SearchEntityId,
            Title = entity.SearchTitle,
            Content = entity.SearchContent,
            CreatedOn = now,
            ModifiedOn = now,
        });
    }
}
