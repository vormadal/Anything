using System.Runtime.CompilerServices;
using Anything.Core.Entities;
using Anything.Core.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Anything.Database.Interceptors;

/// <summary>
/// Keeps <see cref="SearchDocument"/> rows in sync with any entity implementing
/// <see cref="ISearchable"/>, so command handlers never have to remember to
/// update the search index themselves.
/// </summary>
/// <remarks>
/// Added entities can't be indexed inside <see cref="SavingChangesAsync"/>
/// because their primary key isn't assigned until the insert completes, so
/// they're staged here (keyed by <see cref="DbContext"/> instance, not by
/// interceptor instance, in case the same interceptor instance is ever shared
/// across scopes) and flushed with a second, independent <c>SaveChangesAsync</c>
/// call in <see cref="SavedChangesAsync"/> once their id is known. This
/// nested-save pattern is safe here because it runs after the original save has
/// already committed — it is not reentrant into the same save operation.
/// </remarks>
public class SearchIndexInterceptor : SaveChangesInterceptor
{
    private const string DeletedOnProperty = "DeletedOn";
    private static readonly ConditionalWeakTable<DbContext, List<ISearchable>> PendingAdds = new();

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        if (eventData.Context is { } context)
            await SyncTrackedEntries(context, ct);

        return await base.SavingChangesAsync(eventData, result, ct);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken ct = default)
    {
        if (eventData.Context is { } context)
            await FlushPendingAdds(context, ct);

        return await base.SavedChangesAsync(eventData, result, ct);
    }

    private static async Task SyncTrackedEntries(DbContext context, CancellationToken ct)
    {
        var pending = PendingAdds.GetOrCreateValue(context);

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is not ISearchable searchable)
                continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    pending.Add(searchable);
                    break;
                case EntityState.Deleted:
                    await RemoveDocument(context, searchable, ct);
                    break;
                case EntityState.Modified when IsNewlySoftDeleted(entry):
                    await RemoveDocument(context, searchable, ct);
                    break;
                case EntityState.Modified:
                    await UpsertDocument(context, searchable, ct);
                    break;
            }
        }
    }

    private static async Task FlushPendingAdds(DbContext context, CancellationToken ct)
    {
        if (!PendingAdds.TryGetValue(context, out var pending) || pending.Count == 0)
            return;

        var now = DateTime.UtcNow;
        foreach (var searchable in pending)
        {
            context.Set<SearchDocument>().Add(new SearchDocument
            {
                HouseholdId = searchable.HouseholdId,
                EntityType = searchable.SearchEntityType,
                EntityId = searchable.SearchEntityId,
                Title = searchable.SearchTitle,
                Content = searchable.SearchContent,
                CreatedOn = now,
                ModifiedOn = now,
            });
        }

        PendingAdds.Remove(context);
        await context.SaveChangesAsync(ct);
    }

    private static bool IsNewlySoftDeleted(EntityEntry entry)
    {
        var property = entry.Property(DeletedOnProperty);
        return property.CurrentValue is not null && property.OriginalValue is null;
    }

    private static async Task UpsertDocument(DbContext context, ISearchable searchable, CancellationToken ct)
    {
        var document = await FindDocument(context, searchable, ct);
        var now = DateTime.UtcNow;
        if (document is null)
        {
            context.Set<SearchDocument>().Add(new SearchDocument
            {
                HouseholdId = searchable.HouseholdId,
                EntityType = searchable.SearchEntityType,
                EntityId = searchable.SearchEntityId,
                Title = searchable.SearchTitle,
                Content = searchable.SearchContent,
                CreatedOn = now,
                ModifiedOn = now,
            });
            return;
        }

        document.HouseholdId = searchable.HouseholdId;
        document.Title = searchable.SearchTitle;
        document.Content = searchable.SearchContent;
        document.ModifiedOn = now;
    }

    private static async Task RemoveDocument(DbContext context, ISearchable searchable, CancellationToken ct)
    {
        var document = await FindDocument(context, searchable, ct);
        if (document is not null)
            context.Set<SearchDocument>().Remove(document);
    }

    private static Task<SearchDocument?> FindDocument(DbContext context, ISearchable searchable, CancellationToken ct) =>
        context.Set<SearchDocument>().FirstOrDefaultAsync(
            d => d.EntityType == searchable.SearchEntityType && d.EntityId == searchable.SearchEntityId, ct);
}
