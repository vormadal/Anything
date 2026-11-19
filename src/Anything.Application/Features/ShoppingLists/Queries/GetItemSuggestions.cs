using Anything.Application.Common;
using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

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
/// Ranking rules live in <see cref="ItemSuggestionRanker"/>.
/// </remarks>
public record GetItemSuggestionsQuery(int ShoppingListId, string? Search = null, int Limit = 8) : IRequest<IResult>;

public class GetItemSuggestionsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IHouseholdContext householdContext,
    TimeProvider timeProvider) : IRequestHandler<GetItemSuggestionsQuery, IResult>
{
    public const int UsageWindowMonths = 3;
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
        var cutoff = timeProvider.GetUtcNow().UtcDateTime.AddMonths(-UsageWindowMonths);

        var namesOnList = await itemRepository.Query().AsNoTracking()
            .Where(i => i.ShoppingListId == query.ShoppingListId && i.CompletedOn == null)
            .Select(i => i.Name)
            .ToListAsync(ct);

        var usage = (await itemRepository.Query().AsNoTracking()
                .Where(i => i.ShoppingListId == query.ShoppingListId && i.CreatedOn >= cutoff)
                .Select(i => new { i.Name, i.Amount, i.Unit, i.AddedByRecipe, i.CreatedOn })
                .ToListAsync(ct))
            .Select(i => new ItemUsageRow(i.Name, i.Amount, i.Unit, i.AddedByRecipe != null, i.CreatedOn))
            .ToList();

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
            var containsPattern = FuzzySearch.ContainsPattern(search);
            candidates = (await recommendations
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.PreferredUnit,
                        r.ShoppingListId,
                        NameContains = EF.Functions.Like(r.Name.ToLower(), containsPattern),
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

    private static IResult NoSuggestions() => Results.Ok(new List<ItemSuggestionResponse>());
}
