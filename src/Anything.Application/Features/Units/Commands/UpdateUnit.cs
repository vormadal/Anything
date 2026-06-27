using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Commands;

public record UpdateUnitCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateUnitHandler(IRepository<MeasurementUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateUnitCommand, IResult>
{
    public async Task<IResult> Handle(UpdateUnitCommand command, CancellationToken ct = default)
    {
        var unit = await repository.Query()
            .Where(u => u.Id == command.Id && u.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (unit is null)
            return Results.NotFound(UnitErrors.NotFound);

        var name = command.Name.Trim();
        var duplicate = await repository.Query()
            .AnyAsync(u => u.Id != command.Id
                           && u.HouseholdId == householdContext.HouseholdId
                           && u.Name.ToLower() == name.ToLower(), ct);
        if (duplicate)
            return Results.Conflict(UnitErrors.Duplicate);

        unit.Name = name;
        unit.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
