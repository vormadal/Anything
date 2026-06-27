using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Units.Commands;

public record DeleteUnitCommand(int Id) : IRequest<IResult>;

public class DeleteUnitHandler(IRepository<MeasurementUnit> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteUnitCommand, IResult>
{
    public async Task<IResult> Handle(DeleteUnitCommand command, CancellationToken ct = default)
    {
        var unit = await repository.Query()
            .Where(u => u.Id == command.Id && u.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (unit is null)
            return Results.NotFound(UnitErrors.NotFound);

        repository.Remove(unit);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
