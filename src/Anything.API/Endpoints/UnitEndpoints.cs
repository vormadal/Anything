using Anything.Application.Features.Units.Commands;
using Anything.Application.Features.Units.Queries;
using Anything.Contracts.Units;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Mediator;
using Microsoft.AspNetCore.Mvc;

namespace Anything.API.Endpoints;

public static class UnitEndpoints
{
    public static void MapUnitEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/units");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetUnitsQuery());
        })
        .WithName("GetUnits")
        .Produces<List<MeasurementUnit>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapPost("/", async ([FromBody] CreateUnitRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateUnitCommand(request.Name));
        })
        .WithName("CreateUnit")
        .Produces<MeasurementUnit>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status409Conflict)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPut("/{id}", async (int id, [FromBody] UpdateUnitRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateUnitCommand(id, request.Name));
        })
        .WithName("UpdateUnit")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteUnitCommand(id));
        })
        .WithName("DeleteUnit")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/export", async (IMediator mediator) =>
        {
            return await mediator.Send(new ExportUnitsQuery());
        })
        .WithName("ExportUnits")
        .Produces<ExportUnitsResponse>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/import", async ([FromBody] ImportUnitsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ImportUnitsCommand(request.Units));
        })
        .WithName("ImportUnits")
        .Produces(StatusCodes.Status204NoContent)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/seed-defaults", async (IMediator mediator) =>
        {
            return await mediator.Send(new SeedDefaultUnitsCommand());
        })
        .WithName("SeedDefaultUnits")
        .Produces(StatusCodes.Status204NoContent)
        .RequireAuthorization(UserRoles.Admin);
    }
}
