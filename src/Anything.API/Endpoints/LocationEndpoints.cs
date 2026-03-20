using Anything.Application.Features.Locations.Commands;
using Anything.Application.Features.Locations.Queries;
using Anything.Contracts.Locations;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class LocationEndpoints
{
    public static void MapLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/locations");

        group.MapGet("/", async (IMediator mediator) =>
            await mediator.Send(new GetLocationsQuery()))
            .WithName("GetLocations")
            .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new GetLocationByIdQuery(id)))
            .WithName("GetLocationById")
            .RequireAuthorization();

        group.MapPost("/", async (CreateLocationRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateLocationCommand(request.Name));
            return Results.Created($"/api/locations/{result.Id}", result);
        })
        .WithName("CreateLocation")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateLocationRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateLocationCommand(id, request.Name)))
            .WithName("UpdateLocation")
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteLocationCommand(id)))
            .WithName("DeleteLocation")
            .RequireAuthorization();
    }
}
