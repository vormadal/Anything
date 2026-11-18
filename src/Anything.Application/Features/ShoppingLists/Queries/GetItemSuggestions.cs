using Anything.Application.Common;
using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Anything.Application.Features.ShoppingLists.Queries;

/// <summary>
/// Add-box typeahead for one shopping list: the list's own plus shared suggestable recommendations,
/// ranked by match and then by how often each was added to <em>this</em> list in the last
/// <see cref="GetItemSuggestionsHandler.UsageWindowMonths"/> months, with a suggested amount/unit.
/// A blank search returns the list's most-added items, so the box can show "your usuals" on focus.
/// </summary>
/// <remarks>
/// Popularity is computed from <see cref="ShoppingListItem"/> history (completed items are kept with
/// <c>CompletedOn</c> set), so no counters need maintaining and past history counts from day one.
/// Items deleted by hand are hard-deleted and therefore — deliberately — never counted.
///
/// That usage history is cached in memory per list for <see cref="GetItemSuggestionsHandler.UsageCacheDuration"/>
/// and deliberately not invalidated on writes: popularity over a quarter barely moves in a day, and
/// invalidating on every add would empty the cache exactly while a list is being filled. What must be
/// exact stays live on every call — the list/household check, the items currently on the list (so an
/// item just added is never suggested again) and the name match itself. The cache is per process; with
/// several API instances each warms its own, which only costs one extra query per instance.
/// Ranking rules live in <see cref="ItemSuggestionRanker"/>.
/// </remarks>
public record GetItemSuggestionsQuery(int ShoppingListId, string? Search = null, int Limit = 8) : IRequest<IResult>;

public class GetItemSuggestionsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IHouseholdContext householdContext,
    TimeProvider timeProvider,
    IMemoryCache cache) : IRequestHandler<GetItemSuggestionsQuery, IResult>
{
    public const int UsageWindowMonths = 3;
    public static readonly TimeSpan UsageCacheDuration = TimeSpan.FromHours(12);
    public const int MaxLimit = 20;

    // Upper bound on matching recommendations pulled before popularity ranking. Large enough that a
    // one-letter query doesn't cut off popular items, small enough to keep the row set trivial.
    private const int MaxCandidates = 500;

    public async Task<IResult> Handle(GetItemSuggestionsQuery query, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var list = await listRepository.Query().AsNoTracking()
            .Where(l => l.Id == query.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdId)
            .Select(l => new { l.Type })
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound("Shopping list not found.");

        // General checklists don't seed recommendations or carry amounts.
        if (list.Type == ListType.General)
            return NoSuggestions();

        var limit = Math.Clamp(query.Limit, 1, MaxLimit);

        var namesOnList = await itemRepository.Query().AsNoTracking()
            .Where(i => i.ShoppingListId == query.ShoppingListId && i.CompletedOn == null)
            .Select(i => i.Name)
            .ToListAsync(ct);

        var usage = await GetUsage(query.ShoppingListId, ct);

        var recommendations = recommendationRepository.Query().AsNoTracking()
            .Where(r => r.HouseholdId == householdId
                        && r.IncludeInSuggestions
                        && (r.ShoppingListId == query.ShoppingListId || r.ShoppingListId == null));

        List<ItemSuggestionCandidate> candidates;
        if (string.IsNullOrWhiteSpace(query.Search))
        {
            var usedNames = usage.Select(u => FuzzySearch.Normalize(u.Name)).Distinct().ToList();
            if (usedNames.Count == 0)
                return NoSuggestions();

            candidates = (await recommendations
                    .Where(r => usedNames.Contains(r.Name.ToLower()))
                    .Select(r => new { r.Id, r.Name, r.PreferredUnit, r.ShoppingListId })
                    .Take(MaxCandidates)
                    .ToListAsync(ct))
                .Select(r => new ItemSuggestionCandidate(r.Id, r.Name, r.PreferredUnit, r.ShoppingListId != null, 0))
                .ToList();
        }
        else
        {
            var search = FuzzySearch.Normalize(query.Search);
            candidates = (await recommendations
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.PreferredUnit,
                        r.ShoppingListId,
                        NameContains = r.Name.ToLower().Contains(search),
                        NameSimilarity = PgTrigramFunctions.WordSimilarity(search, r.Name),
                    })
                    .Where(x => x.NameContains || x.NameSimilarity > FuzzySearch.SimilarityThreshold)
                    .OrderByDescending(x => x.NameContains)
                    .ThenByDescending(x => x.NameSimilarity)
                    .Take(MaxCandidates)
                    .ToListAsync(ct))
                .Select(r => new ItemSuggestionCandidate(r.Id, r.Name, r.PreferredUnit, r.ShoppingListId != null, r.NameSimilarity))
                .ToList();
        }

        return Results.Ok(ItemSuggestionRanker.Rank(candidates, usage, namesOnList, query.Search, limit));
    }

    // Keyed by list id alone: ids are global, and the household check above runs before any cache read.
    internal static string UsageCacheKey(int shoppingListId) => $"shopping-list-item-usage:{shoppingListId}";

    private async Task<List<ItemUsageRow>> GetUsage(int shoppingListId, CancellationToken ct)
    {
        var key = UsageCacheKey(shoppingListId);
        if (cache.TryGetValue(key, out List<ItemUsageRow>? cached) && cached is not null)
            return cached;

        var cutoff = timeProvider.GetUtcNow().UtcDateTime.AddMonths(-UsageWindowMonths);
        var usage = (await itemRepository.Query().AsNoTracking()
                .Where(i => i.ShoppingListId == shoppingListId && i.CreatedOn >= cutoff)
                .Select(i => new { i.Name, i.Amount, i.Unit, i.AddedByRecipe, i.CreatedOn })
                .ToListAsync(ct))
            .Select(i => new ItemUsageRow(i.Name, i.Amount, i.Unit, i.AddedByRecipe != null, i.CreatedOn))
            .ToList();

        cache.Set(key, usage, UsageCacheDuration);
        return usage;
    }

    private static IResult NoSuggestions() => Results.Ok(new List<ItemSuggestionResponse>());
}
