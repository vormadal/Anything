using Anything.Application.Features.Inventory.Commands;
using Anything.Application.Features.Inventory.Queries;
using Anything.Contracts.Inventory;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryStorageUnitEndpoints
{
    public static void MapInventoryStorageUnitEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-storage-units");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryStorageUnitsQuery());
        })
        .WithName("GetInventoryStorageUnits")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryStorageUnitByIdQuery(id));
        })
        .WithName("GetInventoryStorageUnitById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryStorageUnitRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateInventoryStorageUnitCommand(request.Name, request.Type));
            return Results.Created($"/api/inventory-storage-units/{result.Id}", result);
        })
        .WithName("CreateInventoryStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryStorageUnitRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryStorageUnitCommand(id, request.Name, request.Type));
        })
        .WithName("UpdateInventoryStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryStorageUnitCommand(id));
        })
        .WithName("DeleteInventoryStorageUnit")
        .RequireAuthorization();
    }
}
