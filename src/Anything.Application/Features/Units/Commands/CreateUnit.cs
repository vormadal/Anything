using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Commands;

public record CreateUnitCommand(string Name) : IRequest<IResult>;

public class CreateUnitHandler(IRepository<MeasurementUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateUnitCommand, IResult>
{
    public async Task<IResult> Handle(CreateUnitCommand command, CancellationToken ct = default)
    {
        var name = command.Name.Trim();
        var exists = await repository.Query()
            .AnyAsync(u => u.HouseholdId == householdContext.HouseholdId && u.Name.ToLower() == name.ToLower(), ct);
        if (exists)
            return Results.Conflict(UnitErrors.Duplicate);

        var unit = new MeasurementUnit
        {
            HouseholdId = householdContext.HouseholdId,
            Name = name,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(unit);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/units/{unit.Id}", unit);
    }
}
