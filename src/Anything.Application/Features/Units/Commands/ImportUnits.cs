using Anything.Contracts.Units;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Commands;

public record ImportUnitsCommand(List<UnitImportExportItem> Units) : IRequest<IResult>;

public class ImportUnitsHandler(
    IRepository<MeasurementUnit> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<ImportUnitsCommand, IResult>
{
    public async Task<IResult> Handle(ImportUnitsCommand command, CancellationToken ct = default)
    {
        var existing = await repository.Query()
            .Where(u => u.HouseholdId == householdContext.HouseholdId)
            .ToDictionaryAsync(u => u.Name, StringComparer.OrdinalIgnoreCase, ct);

        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var item in command.Units)
        {
            var name = item.Name.Trim();
            if (name.Length == 0)
                continue;

            if (item.Delete)
            {
                if (existing.TryGetValue(name, out var toDelete))
                {
                    repository.Remove(toDelete);
                    existing.Remove(name);
                }

                continue;
            }

            if (existing.ContainsKey(name))
                continue;

            var unit = new MeasurementUnit
            {
                HouseholdId = householdContext.HouseholdId,
                Name = name,
                CreatedOn = now,
            };
            repository.Add(unit);
            existing[name] = unit;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
