using Anything.Core.Constants;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Units.Commands;

public record SeedDefaultUnitsCommand : IRequest<IResult>;

public class SeedDefaultUnitsHandler(IUnitCatalog unitCatalog, IUnitOfWork unitOfWork)
    : IRequestHandler<SeedDefaultUnitsCommand, IResult>
{
    public async Task<IResult> Handle(SeedDefaultUnitsCommand command, CancellationToken ct = default)
    {
        foreach (var name in DefaultUnits.All)
            await unitCatalog.EnsureUnit(name, ct);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
