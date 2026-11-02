using Anything.Core.Repositories;
using Anything.Application.Common;
using Anything.Core.Entities;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Renovation.Commands;

public record UploadRenovationPurchaseAttachmentCommand(
    int ProjectId,
    int PurchaseId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long ContentLength,
    string? AttachmentName = null) : IRequest<IResult>;

public class UploadRenovationPurchaseAttachmentHandler(
    RenovationRepositories repos,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadRenovationPurchaseAttachmentCommand, IResult>
{
    private const string PurchaseNotFound = "Purchase not found.";
    private const int NameMaxLength = 200;

    public async Task<IResult> Handle(UploadRenovationPurchaseAttachmentCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        if (!await RenovationPurchaseLookup.PurchaseExists(repos, householdId, command.ProjectId, command.PurchaseId, ct))
            return Results.NotFound(PurchaseNotFound);

        if (UploadValidation.ValidateFileSize(command.ContentLength) is { } sizeError)
            return sizeError;

        if (UploadValidation.ValidateAttachmentContentType(command.ContentType) is { } typeError)
            return typeError;

        var storageKey = await imageStorageService.Upload(
            command.FileStream,
            command.FileName,
            command.ContentType,
            command.ContentLength,
            ct,
            folder: "renovation");

        var attachment = new RenovationPurchaseAttachment
        {
            HouseholdId = householdId,
            PurchaseId = command.PurchaseId,
            StorageKey = storageKey,
            Name = DefaultName(command),
            ContentType = command.ContentType,
            Size = command.ContentLength,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        repos.PurchaseAttachments.Add(attachment);
        await unitOfWork.SaveChanges(ct);

        return Results.Created(
            $"/api/renovation-projects/{command.ProjectId}/purchases/{command.PurchaseId}/attachments/{attachment.Id}",
            value: null);
    }

    // Same naming as bill attachments; capped at the column width, since a long client-supplied name would fail the save.
    private static string DefaultName(UploadRenovationPurchaseAttachmentCommand command)
    {
        var name = !string.IsNullOrWhiteSpace(command.AttachmentName)
            ? command.AttachmentName
            : FileStem(command.FileName);
        return name.Length <= NameMaxLength ? name : name[..NameMaxLength];
    }

    private static string FileStem(string fileName)
    {
        var stem = Path.GetFileNameWithoutExtension(fileName);
        return string.IsNullOrWhiteSpace(stem) ? Path.GetFileName(fileName) : stem;
    }
}
