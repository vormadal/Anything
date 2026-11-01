using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

/// <summary>
/// Updates a material's defaults. Existing lines keep their own copied price; use
/// <see cref="ReplaceRenovationMaterialCommand"/> or a line update to re-price them.
/// </summary>
public record UpdateRenovationMaterialCommand(int Id, SaveRenovationMaterialRequest Request) : IRequest<IResult>;

public class UpdateRenovationMaterialHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateRenovationMaterialCommand, IResult>
{
    public async Task<IResult> Handle(UpdateRenovationMaterialCommand command, CancellationToken ct = default)
    {
        var material = await repos.Materials.Query()
            .FirstOrDefaultAsync(m => m.Id == command.Id && m.HouseholdId == householdContext.HouseholdId && m.DeletedOn == null, ct);
        if (material is null)
            return Results.NotFound();
        if (!RenovationValidation.IsValidProductUrl(command.Request.ProductUrl))
            return Results.BadRequest("Product URL must be an absolute http or https link.");

        Apply(material, command.Request);
        material.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }

    internal static void Apply(RenovationMaterial material, SaveRenovationMaterialRequest request)
    {
        material.Name = request.Name.Trim();
        material.Category = request.Category.Trim();
        material.Unit = request.Unit.Trim();
        material.DefaultPrice = request.DefaultPrice;
        material.WastePercent = request.WastePercent;
        material.PackSize = request.PackSize;
        material.ProductUrl = string.IsNullOrWhiteSpace(request.ProductUrl) ? null : request.ProductUrl.Trim();
    }
}
