using Anything.Contracts.ShoppingLists;

namespace Anything.Application.Features.ShoppingLists;

/// <summary>A suggestable recommendation that matched the typed text (or any, for a blank query).</summary>
internal sealed record ItemSuggestionCandidate(int Id, string Name, string? PreferredUnit, bool IsListScoped, double Similarity);

/// <summary>One item previously added to the list, inside the usage window.</summary>
internal sealed record ItemUsageRow(string Name, decimal? Amount, string? Unit, bool AddedByRecipe, DateTime CreatedOn);

/// <summary>
/// Pure ranking for the add-box typeahead, kept apart from the EF query so it can be unit-tested
/// without Postgres (the candidate query itself uses pg_trgm and is covered by integration tests).
/// </summary>
/// <remarks>
/// Match quality always comes first — a popular "Milk" must not outrank "Mince" when typing "min" —
/// so the order is: prefix match, then substring, then fuzzy; inside each tier, times added, then
/// most recently added, then similarity, then name. A blank query has no match tier and is ordered
/// by popularity alone, and only items that have actually been added in the window are returned.
/// Items still on the list (not completed) are never suggested.
///
/// The suggested quantity is the most common (amount, unit) pair, ties broken by most recent.
/// Recipe- and food-plan-added rows count toward popularity but not quantity: their amounts are
/// recipe-scaled, not what the household usually buys.
/// </remarks>
internal static class ItemSuggestionRanker
{
    public static List<ItemSuggestionResponse> Rank(
        IEnumerable<ItemSuggestionCandidate> candidates,
        IEnumerable<ItemUsageRow> usage,
        IEnumerable<string> namesOnList,
        string? search,
        int limit)
    {
        var onList = namesOnList.Select(Key).ToHashSet();
        var usageByName = usage.GroupBy(u => Key(u.Name)).ToDictionary(g => g.Key, g => g.ToList());
        var term = string.IsNullOrWhiteSpace(search) ? null : Key(search);

        return candidates
            .Where(c => !string.IsNullOrWhiteSpace(c.Name) && !onList.Contains(Key(c.Name)))
            // A name can exist both as this list's own and as a shared suggestion — keep one, preferring the list's.
            .GroupBy(c => Key(c.Name))
            .Select(g => g.OrderByDescending(c => c.IsListScoped).ThenBy(c => c.Id).First())
            .Select(c =>
            {
                var rows = usageByName.GetValueOrDefault(Key(c.Name)) ?? [];
                return new
                {
                    Candidate = c,
                    Rows = rows,
                    Tier = term is null ? 0 : MatchTier(Key(c.Name), term),
                    LastAdded = rows.Count > 0 ? rows.Max(r => r.CreatedOn) : DateTime.MinValue,
                };
            })
            .Where(x => term is not null || x.Rows.Count > 0)
            .OrderBy(x => x.Tier)
            .ThenByDescending(x => x.Rows.Count)
            .ThenByDescending(x => x.LastAdded)
            .ThenByDescending(x => x.Candidate.Similarity)
            .ThenBy(x => x.Candidate.Name, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .Select(x =>
            {
                var (amount, unit) = SuggestQuantity(x.Rows);
                return new ItemSuggestionResponse(
                    x.Candidate.Id,
                    x.Candidate.Name,
                    amount,
                    unit ?? NullIfBlank(x.Candidate.PreferredUnit),
                    x.Rows.Count);
            })
            .ToList();
    }

    internal static (decimal? Amount, string? Unit) SuggestQuantity(IEnumerable<ItemUsageRow> rows)
    {
        var best = rows
            .Where(r => !r.AddedByRecipe && (r.Amount != null || !string.IsNullOrWhiteSpace(r.Unit)))
            .GroupBy(r => (r.Amount, Unit: NullIfBlank(r.Unit)?.ToLowerInvariant()))
            .Select(g => new { Count = g.Count(), Latest = g.OrderByDescending(r => r.CreatedOn).First() })
            .OrderByDescending(x => x.Count)
            .ThenByDescending(x => x.Latest.CreatedOn)
            .FirstOrDefault();

        return best is null ? (null, null) : (best.Latest.Amount, NullIfBlank(best.Latest.Unit));
    }

    private static int MatchTier(string name, string term) =>
        name.StartsWith(term, StringComparison.Ordinal) ? 0
        : name.Contains(term, StringComparison.Ordinal) ? 1
        : 2;

    private static string Key(string value) => value.Trim().ToLowerInvariant();

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
