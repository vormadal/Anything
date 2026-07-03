using Anything.Contracts.HomePreferences;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.HomePreferences.Queries;

public record GetHomeCardPreferencesQuery(int UserId) : IRequest<List<HomeCardPreferenceResponse>>;

public class GetHomeCardPreferencesHandler(IRepository<HomeCardPreference> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetHomeCardPreferencesQuery, List<HomeCardPreferenceResponse>>
{
    public async Task<List<HomeCardPreferenceResponse>> Handle(GetHomeCardPreferencesQuery query, CancellationToken ct = default)
    {
        var existing = await repository.Query()
            .Where(p => p.HouseholdId == householdContext.HouseholdId && p.UserId == query.UserId)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        var nextSortOrder = existing.Count == 0 ? 0 : existing.Max(p => p.SortOrder) + 1;
        foreach (var cardKey in HomeCardKeys.All)
        {
            if (existing.Any(p => p.CardKey == cardKey))
                continue;

            existing.Add(new HomeCardPreference
            {
                HouseholdId = householdContext.HouseholdId,
                UserId = query.UserId,
                CardKey = cardKey,
                SortOrder = nextSortOrder++,
                IsVisible = true
            });
        }

        return existing
            .OrderBy(p => p.SortOrder)
            .Select(p => new HomeCardPreferenceResponse(p.CardKey, p.SortOrder, p.IsVisible))
            .ToList();
    }
}
