using Anything.Application.Features.Inventory.Commands;
using Anything.Application.Features.Inventory.Queries;
using Anything.Contracts.Inventory;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryItemEndpoints
{
    public static void MapInventoryItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-items");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryItemsQuery());
        })
        .WithName("GetInventoryItems")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryItemByIdQuery(id));
        })
        .WithName("GetInventoryItemById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateInventoryItemCommand(request.Name, request.Description, request.BoxId, request.StorageUnitId));
        })
        .WithName("CreateInventoryItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryItemCommand(id, request.Name, request.Description, request.BoxId, request.StorageUnitId));
        })
        .WithName("UpdateInventoryItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryItemCommand(id));
        })
        .WithName("DeleteInventoryItem")
        .RequireAuthorization();
    }
}
