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
        .Produces<InventoryStorageUnitResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryStorageUnitRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateInventoryStorageUnitCommand(request.Name, request.ParentId));
        })
        .WithName("CreateInventoryStorageUnit")
        .Produces<InventoryStorageUnitResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryStorageUnitRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryStorageUnitCommand(id, request.Name, request.ParentId));
        })
        .WithName("UpdateInventoryStorageUnit")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryStorageUnitCommand(id));
        })
        .WithName("DeleteInventoryStorageUnit")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/attachments", async (int id, IMediator mediator) =>
            await mediator.Send(new GetInventoryStorageUnitAttachmentsQuery(id)))
        .WithName("GetInventoryStorageUnitAttachments")
        .Produces<InventoryAttachmentResponse[]>()
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/attachments/{attachmentId}/download", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DownloadInventoryStorageUnitAttachmentQuery(id, attachmentId)))
        .WithName("DownloadInventoryStorageUnitAttachment")
        .Produces(200)
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/attachments", async (int id, IFormFile? file, string? kind, string? name, IMediator mediator) =>
        {
            if (file is null || file.Length == 0)
                return Results.BadRequest("No file uploaded or file is empty.");
            await using var stream = file.OpenReadStream();
            return await mediator.Send(new UploadInventoryStorageUnitAttachmentCommand(
                id, stream, file.FileName, file.ContentType, file.Length, kind, name));
        })
        .WithName("UploadInventoryStorageUnitAttachment")
        .Produces<InventoryAttachmentResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .DisableAntiforgery()
        .RequireAuthorization();

        group.MapDelete("/{id}/attachments/{attachmentId}", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DeleteInventoryStorageUnitAttachmentCommand(id, attachmentId)))
        .WithName("DeleteInventoryStorageUnitAttachment")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
