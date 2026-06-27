using Anything.Contracts.Units;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Queries;

public record ExportUnitsQuery : IRequest<ExportUnitsResponse>;

public class ExportUnitsHandler(IRepository<MeasurementUnit> repository, IHouseholdContext householdContext)
    : IRequestHandler<ExportUnitsQuery, ExportUnitsResponse>
{
    public async Task<ExportUnitsResponse> Handle(ExportUnitsQuery query, CancellationToken ct = default)
    {
        var items = await repository.Query()
            .Where(u => u.HouseholdId == householdContext.HouseholdId)
            .OrderBy(u => u.Name)
            .Select(u => new UnitImportExportItem(u.Name))
            .ToListAsync(ct);

        return new ExportUnitsResponse(items);
    }
}
