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
        .Produces<InventoryItemResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateInventoryItemCommand(
                request.Name, request.Description, request.BoxId, request.StorageUnitId,
                request.Quantity, request.Brand, request.Model, request.SerialNumber,
                request.PurchasedOn, request.PurchasePrice, request.WarrantyExpiresOn, request.Notes));
        })
        .WithName("CreateInventoryItem")
        .Produces<InventoryItemResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryItemCommand(
                id, request.Name, request.Description, request.BoxId, request.StorageUnitId,
                request.Quantity, request.Brand, request.Model, request.SerialNumber,
                request.PurchasedOn, request.PurchasePrice, request.WarrantyExpiresOn, request.Notes));
        })
        .WithName("UpdateInventoryItem")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryItemCommand(id));
        })
        .WithName("DeleteInventoryItem")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapPut("/{id}/fields", async (int id, UpdateInventoryItemFieldsRequest request, IMediator mediator) =>
        {
            var fields = request.Fields.Select(f => new InventoryFieldInput(f.Label, f.Value)).ToList();
            return await mediator.Send(new UpdateInventoryItemFieldsCommand(id, fields));
        })
        .WithName("UpdateInventoryItemFields")
        .Produces<InventoryItemFieldResponse[]>()
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapGet("/{id}/attachments", async (int id, IMediator mediator) =>
            await mediator.Send(new GetInventoryItemAttachmentsQuery(id)))
        .WithName("GetInventoryItemAttachments")
        .Produces<InventoryAttachmentResponse[]>()
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/attachments/{attachmentId}/download", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DownloadInventoryItemAttachmentQuery(id, attachmentId)))
        .WithName("DownloadInventoryItemAttachment")
        .Produces(200)
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/attachments", async (int id, IFormFile? file, string? kind, string? name, IMediator mediator) =>
        {
            if (UploadEndpointValidation.ValidateFile(file) is { } fileError)
                return fileError;
            await using var stream = file!.OpenReadStream();
            return await mediator.Send(new UploadInventoryItemAttachmentCommand(
                id, stream, file.FileName, file.ContentType, file.Length, kind, name));
        })
        .WithName("UploadInventoryItemAttachment")
        .Produces<InventoryAttachmentResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .DisableAntiforgery()
        .RequireAuthorization();

        group.MapDelete("/{id}/attachments/{attachmentId}", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DeleteInventoryItemAttachmentCommand(id, attachmentId)))
        .WithName("DeleteInventoryItemAttachment")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
