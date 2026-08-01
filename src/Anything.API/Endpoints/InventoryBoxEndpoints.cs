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
        .Produces<InventoryBoxResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryBoxRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateInventoryBoxCommand(
                request.Number, request.StorageUnitId, request.Label, request.Description));
        })
        .WithName("CreateInventoryBox")
        .Produces<InventoryBoxResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryBoxRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateInventoryBoxCommand(
                id, request.Number, request.StorageUnitId, request.Label, request.Description));
        })
        .WithName("UpdateInventoryBox")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteInventoryBoxCommand(id));
        })
        .WithName("DeleteInventoryBox")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/attachments", async (int id, IMediator mediator) =>
            await mediator.Send(new GetInventoryBoxAttachmentsQuery(id)))
        .WithName("GetInventoryBoxAttachments")
        .Produces<InventoryAttachmentResponse[]>()
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/attachments/{attachmentId}/download", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DownloadInventoryBoxAttachmentQuery(id, attachmentId)))
        .WithName("DownloadInventoryBoxAttachment")
        .Produces(200)
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/attachments", async (int id, IFormFile? file, string? kind, string? name, IMediator mediator) =>
        {
            if (UploadEndpointValidation.ValidateFile(file) is { } fileError)
                return fileError;
            await using var stream = file!.OpenReadStream();
            return await mediator.Send(new UploadInventoryBoxAttachmentCommand(
                id, stream, file.FileName, file.ContentType, file.Length, kind, name));
        })
        .WithName("UploadInventoryBoxAttachment")
        .Produces<InventoryAttachmentResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .DisableAntiforgery()
        .RequireAuthorization();

        group.MapDelete("/{id}/attachments/{attachmentId}", async (int id, int attachmentId, IMediator mediator) =>
            await mediator.Send(new DeleteInventoryBoxAttachmentCommand(id, attachmentId)))
        .WithName("DeleteInventoryBoxAttachment")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
