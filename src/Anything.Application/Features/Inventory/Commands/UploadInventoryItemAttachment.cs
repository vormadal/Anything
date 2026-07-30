using Anything.Application.Features.Inventory;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UploadInventoryItemAttachmentCommand(
    int ItemId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long ContentLength,
    string? Kind,
    string? AttachmentName) : IRequest<IResult>;

public class UploadInventoryItemAttachmentHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadInventoryItemAttachmentCommand, IResult>
{
    private const string ItemNotFound = "Item not found.";
    private const string InvalidFile = "No file uploaded or file is empty.";
    private const string InvalidKind = "Invalid attachment kind.";

    public async Task<IResult> Handle(UploadInventoryItemAttachmentCommand command, CancellationToken ct = default)
    {
        var itemExists = await itemRepository.Query()
            .AnyAsync(i => i.Id == command.ItemId && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId, ct);
        if (!itemExists)
            return Results.NotFound(ItemNotFound);

        if (command.ContentLength == 0)
            return Results.BadRequest(InvalidFile);

        var kind = string.IsNullOrWhiteSpace(command.Kind) ? InventoryAttachmentKinds.Other : command.Kind;
        if (!InventoryAttachmentKinds.All.Contains(kind))
            return Results.BadRequest(InvalidKind);

        var storageKey = await imageStorageService.Upload(
            command.FileStream, command.FileName, command.ContentType, command.ContentLength, ct, folder: "inventory");

        var sortOrder = await attachmentRepository.Query()
            .Where(a => a.ItemId == command.ItemId && a.DeletedOn == null)
            .CountAsync(ct);

        var attachment = new InventoryAttachment
        {
            ItemId = command.ItemId,
            StorageKey = storageKey,
            Name = !string.IsNullOrWhiteSpace(command.AttachmentName)
                ? command.AttachmentName
                : !string.IsNullOrWhiteSpace(Path.GetFileNameWithoutExtension(command.FileName))
                    ? Path.GetFileNameWithoutExtension(command.FileName)
                    : Path.GetFileName(command.FileName),
            ContentType = command.ContentType,
            Kind = kind,
            SortOrder = sortOrder,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        attachmentRepository.Add(attachment);
        await unitOfWork.SaveChanges(ct);

        var downloadUrl = $"/api/inventory-items/{command.ItemId}/attachments/{attachment.Id}/download";
        return Results.Created(downloadUrl, InventoryAttachmentMapping.ToResponse(attachment, imageStorageService, downloadUrl));
    }
}
