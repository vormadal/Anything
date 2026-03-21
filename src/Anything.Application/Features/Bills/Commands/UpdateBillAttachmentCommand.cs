using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Commands;

public record UpdateBillAttachmentCommand(int BillId, int AttachmentId, string Name) : IRequest<IResult>;

public class UpdateBillAttachmentHandler(
    IRepository<BillAttachment> attachmentRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateBillAttachmentCommand, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(UpdateBillAttachmentCommand command, CancellationToken ct = default)
    {
        var attachment = await attachmentRepository.GetById(command.AttachmentId);
        if (attachment is null || attachment.DeletedOn != null || attachment.BillId != command.BillId)
            return Results.NotFound(AttachmentNotFound);

        attachment.Name = command.Name;
        attachment.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
