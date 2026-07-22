using Anything.Contracts.Search;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
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
    public async Task<RebuildSearchIndexResponse> Handle(RebuildSearchIndexCommand command, CancellationToken ct = default)
    {
        var recipes = await recipeRepository.Query().Where(r => r.DeletedOn == null).ToListAsync(ct);
        var shoppingLists = await shoppingListRepository.Query().Where(l => l.DeletedOn == null).ToListAsync(ct);
        var inventoryItems = await inventoryItemRepository.Query().Where(i => i.DeletedOn == null).ToListAsync(ct);

        var searchable = recipes.Cast<ISearchable>()
            .Concat(shoppingLists)
            .Concat(inventoryItems)
            .ToList();

        var existingDocuments = await searchDocumentRepository.Query().ToListAsync(ct);
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
