using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Renovation.Commands;

public record CreateRenovationMaterialCommand(SaveRenovationMaterialRequest Request) : IRequest<IResult>;

public class CreateRenovationMaterialHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateRenovationMaterialCommand, IResult>
{
    public async Task<IResult> Handle(CreateRenovationMaterialCommand command, CancellationToken ct = default)
    {
        var request = command.Request;
        if (!RenovationValidation.IsValidProductUrl(request.ProductUrl))
            return Results.BadRequest("Product URL must be an absolute http or https link.");

        var material = new RenovationMaterial
        {
            HouseholdId = householdContext.HouseholdId,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        UpdateRenovationMaterialHandler.Apply(material, request);
        repos.Materials.Add(material);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/renovation-materials/{material.Id}", RenovationMapping.ToResponse(material));
    }
}
