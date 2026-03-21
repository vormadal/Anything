using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

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
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UploadBillAttachmentCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";
    private const string InvalidFile = "No file uploaded or file is empty.";

    public async Task<IResult> Handle(UploadBillAttachmentCommand command, CancellationToken ct = default)
    {
        var bill = await billRepository.GetById(command.BillId);
        if (bill is null || bill.DeletedOn != null)
            return Results.NotFound(BillNotFound);

        if (command.ContentLength == 0)
            return Results.BadRequest(InvalidFile);

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
            Name = command.AttachmentName ?? Path.GetFileNameWithoutExtension(command.FileName),
            ContentType = command.ContentType,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        attachmentRepository.Add(attachment);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/bills/{command.BillId}/attachments/{attachment.Id}", value: null);
    }
}
