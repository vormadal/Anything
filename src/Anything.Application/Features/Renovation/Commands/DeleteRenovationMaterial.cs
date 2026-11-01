using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

/// <summary>Soft-deletes a material. Lines using it keep their copied name and price.</summary>
public record DeleteRenovationMaterialCommand(int Id) : IRequest<IResult>;

public class DeleteRenovationMaterialHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationMaterialCommand, IResult>
{
    public async Task<IResult> Handle(DeleteRenovationMaterialCommand command, CancellationToken ct = default)
    {
        var material = await repos.Materials.Query()
            .FirstOrDefaultAsync(m => m.Id == command.Id && m.HouseholdId == householdContext.HouseholdId && m.DeletedOn == null, ct);
        if (material is null)
            return Results.NotFound();

        material.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
