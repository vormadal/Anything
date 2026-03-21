using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Commands;

public record DeleteBillAttachmentCommand(int BillId, int AttachmentId) : IRequest<IResult>;

public class DeleteBillAttachmentHandler(
    IRepository<BillAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteBillAttachmentCommand, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteBillAttachmentCommand command, CancellationToken ct = default)
    {
        var attachment = await attachmentRepository.GetById(command.AttachmentId);
        if (attachment is null || attachment.DeletedOn != null || attachment.BillId != command.BillId)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
