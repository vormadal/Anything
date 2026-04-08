using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record DeleteBillAttachmentCommand(int BillId, int AttachmentId) : IRequest<IResult>;

public class DeleteBillAttachmentHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteBillAttachmentCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteBillAttachmentCommand command, CancellationToken ct = default)
    {
        var billExists = await billRepository.Query()
            .AnyAsync(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!billExists)
            return Results.NotFound(BillNotFound);

        var attachment = await attachmentRepository.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.DeletedOn == null && a.BillId == command.BillId, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
