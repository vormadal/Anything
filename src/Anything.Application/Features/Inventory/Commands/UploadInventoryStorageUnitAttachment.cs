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

public record UploadInventoryStorageUnitAttachmentCommand(
    int StorageUnitId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long ContentLength,
    string? Kind,
    string? AttachmentName) : IRequest<IResult>;

public class UploadInventoryStorageUnitAttachmentHandler(
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadInventoryStorageUnitAttachmentCommand, IResult>
{
    private const string StorageUnitNotFound = "Storage unit not found.";
    private const string InvalidKind = "Invalid attachment kind.";

    public async Task<IResult> Handle(UploadInventoryStorageUnitAttachmentCommand command, CancellationToken ct = default)
    {
        var storageUnitExists = await storageUnitRepository.Query()
            .AnyAsync(s => s.Id == command.StorageUnitId && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId, ct);
        if (!storageUnitExists)
            return Results.NotFound(StorageUnitNotFound);

        if (UploadValidation.ValidateFileSize(command.ContentLength) is { } sizeError)
            return sizeError;

        var kind = string.IsNullOrWhiteSpace(command.Kind) ? InventoryAttachmentKinds.Other : command.Kind;
        if (!InventoryAttachmentKinds.All.Contains(kind))
            return Results.BadRequest(InvalidKind);

        var storageKey = await imageStorageService.Upload(
            command.FileStream, command.FileName, command.ContentType, command.ContentLength, ct, folder: "inventory");

        var sortOrder = await attachmentRepository.Query()
            .Where(a => a.StorageUnitId == command.StorageUnitId && a.DeletedOn == null)
            .CountAsync(ct);

        var attachment = new InventoryAttachment
        {
            StorageUnitId = command.StorageUnitId,
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

        var downloadUrl = $"/api/inventory-storage-units/{command.StorageUnitId}/attachments/{attachment.Id}/download";
        return Results.Created(downloadUrl, InventoryAttachmentMapping.ToResponse(attachment, imageStorageService, downloadUrl));
    }
}
