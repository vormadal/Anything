using Anything.Application.Common;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record UploadBillAttachmentCommand(
    int BillId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long ContentLength,
    string? AttachmentName = null) : IRequest<IResult>;

public class UploadBillAttachmentHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadBillAttachmentCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";

    public async Task<IResult> Handle(UploadBillAttachmentCommand command, CancellationToken ct = default)
    {
        var bill = await billRepository.Query()
            .Where(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound(BillNotFound);

        if (UploadValidation.ValidateFileSize(command.ContentLength) is { } sizeError)
            return sizeError;

        var storageKey = await imageStorageService.Upload(
            command.FileStream,
            command.FileName,
            command.ContentType,
            command.ContentLength,
            ct,
            folder: "bills");

        var attachment = new BillAttachment
        {
            BillId = command.BillId,
            StorageKey = storageKey,
            Name = !string.IsNullOrWhiteSpace(command.AttachmentName)
                ? command.AttachmentName
                : !string.IsNullOrWhiteSpace(Path.GetFileNameWithoutExtension(command.FileName))
                    ? Path.GetFileNameWithoutExtension(command.FileName)
                    : Path.GetFileName(command.FileName),
            ContentType = command.ContentType,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        attachmentRepository.Add(attachment);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/bills/{command.BillId}/attachments/{attachment.Id}", value: null);
    }
}
