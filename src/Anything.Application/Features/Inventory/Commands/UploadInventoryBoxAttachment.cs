using Anything.Application.Common;
using Anything.Application.Features.Inventory;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record UploadInventoryBoxAttachmentCommand(
    int BoxId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long ContentLength,
    string? Kind,
    string? AttachmentName) : IRequest<IResult>;

public class UploadInventoryBoxAttachmentHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadInventoryBoxAttachmentCommand, IResult>
{
    private const string BoxNotFound = "Box not found.";
    private const string InvalidKind = "Invalid attachment kind.";

    public async Task<IResult> Handle(UploadInventoryBoxAttachmentCommand command, CancellationToken ct = default)
    {
        var boxExists = await boxRepository.Query()
            .AnyAsync(b => b.Id == command.BoxId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!boxExists)
            return Results.NotFound(BoxNotFound);

        if (UploadValidation.ValidateFileSize(command.ContentLength) is { } sizeError)
            return sizeError;

        var kind = string.IsNullOrWhiteSpace(command.Kind) ? InventoryAttachmentKinds.Other : command.Kind;
        if (!InventoryAttachmentKinds.All.Contains(kind))
            return Results.BadRequest(InvalidKind);

        var storageKey = await imageStorageService.Upload(
            command.FileStream, command.FileName, command.ContentType, command.ContentLength, ct, folder: "inventory");

        var sortOrder = await attachmentRepository.Query()
            .Where(a => a.BoxId == command.BoxId && a.DeletedOn == null)
            .CountAsync(ct);

        var attachment = new InventoryAttachment
        {
            BoxId = command.BoxId,
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

        var downloadUrl = $"/api/inventory-boxes/{command.BoxId}/attachments/{attachment.Id}/download";
        return Results.Created(downloadUrl, InventoryAttachmentMapping.ToResponse(attachment, imageStorageService, downloadUrl));
    }
}
