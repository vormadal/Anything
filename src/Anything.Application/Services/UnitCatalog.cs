using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Services;

public class UnitCatalog(
    IRepository<MeasurementUnit> repository,
    IHouseholdContext householdContext,
    TimeProvider timeProvider) : IUnitCatalog
{
    private readonly HashSet<string> _seenThisScope = new(StringComparer.OrdinalIgnoreCase);

    public async Task EnsureUnit(string? name, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            return;

        var normalized = name.Trim();
        if (!_seenThisScope.Add(normalized))
            return;

        var exists = await repository.Query()
            .AnyAsync(u => u.HouseholdId == householdContext.HouseholdId
                           && u.Name.ToLower() == normalized.ToLower(), ct);
        if (exists)
            return;

        repository.Add(new MeasurementUnit
        {
            HouseholdId = householdContext.HouseholdId,
            Name = normalized,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        });
    }
}
