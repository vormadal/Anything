using Anything.Application.Features.Inventory.Commands;
using Anything.Application.Features.Inventory.Queries;
using Anything.Contracts.Inventory;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryBoxEndpoints
{
    public static void MapInventoryBoxEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-boxes");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryBoxesQuery());
        })
        .WithName("GetInventoryBoxes")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetInventoryBoxByIdQuery(id));
        })
        .WithName("GetInventoryBoxById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryBoxRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateInventoryBoxCommand(request.Number, request.StorageUnitId));
        })
        .WithName("CreateInventoryBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryBoxRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryBoxCommand(id, request.Number, request.StorageUnitId));
        })
        .WithName("UpdateInventoryBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryBoxCommand(id));
        })
        .WithName("DeleteInventoryBox")
        .RequireAuthorization();
    }
}
