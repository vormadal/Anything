using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Queries;

/// <summary>
/// Lists a household's recommendations for the management UI, with optional filters.
/// </summary>
/// <param name="CategoryId">Restrict to a single category.</param>
/// <param name="SuggestableOnly">Only recommendations that appear in autocomplete.</param>
/// <param name="ShoppingListId">
/// Restrict to a single list's suggestions plus the shared (null-list) ones. Ignored when
/// <paramref name="SharedOnly"/> is true.
/// </param>
/// <param name="SharedOnly">Only shared (null-list) suggestions.</param>
/// <param name="Uncategorized">When true, only recommendations with no category.</param>
/// <param name="IncludeInSuggestions">
/// Filter by autocomplete visibility (true = shown, false = hidden). Ignored when
/// <paramref name="SuggestableOnly"/> is true.
/// </param>
public record GetAllRecommendationsQuery(
    int? CategoryId = null,
    bool SuggestableOnly = false,
    int? ShoppingListId = null,
    bool SharedOnly = false,
    bool? Uncategorized = null,
    bool? IncludeInSuggestions = null) : IRequest<List<ShoppingListRecommendation>>;

public class GetAllRecommendationsHandler(IRepository<ShoppingListRecommendation> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetAllRecommendationsQuery, List<ShoppingListRecommendation>>
{
    public async Task<List<ShoppingListRecommendation>> Handle(GetAllRecommendationsQuery query, CancellationToken ct = default)
    {
        var q = repository.Query().AsNoTracking().Where(r => r.HouseholdId == householdContext.HouseholdId);

        // List scope: shared-only, or a specific list's own + the shared ones, or (default) everything.
        if (query.SharedOnly)
            q = q.Where(r => r.ShoppingListId == null);
        else if (query.ShoppingListId.HasValue)
            q = q.Where(r => r.ShoppingListId == query.ShoppingListId || r.ShoppingListId == null);

        if (query.CategoryId.HasValue)
            q = q.Where(r => r.CategoryId == query.CategoryId.Value);

        if (query.Uncategorized == true)
            q = q.Where(r => r.CategoryId == null);

        // The add-box autocomplete asks for suggestable-only so hidden (e.g. recipe-seeded)
        // recommendations never surface as suggestions; management views pass false to see all.
        if (query.SuggestableOnly)
            q = q.Where(r => r.IncludeInSuggestions);
        else if (query.IncludeInSuggestions.HasValue)
            q = q.Where(r => r.IncludeInSuggestions == query.IncludeInSuggestions.Value);

        return await q.OrderBy(r => r.Name).ToListAsync(ct);
    }
}
