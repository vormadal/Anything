using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record UpdateBillAttachmentCommand(int BillId, int AttachmentId, string Name) : IRequest<IResult>;

public class UpdateBillAttachmentHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAttachment> attachmentRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateBillAttachmentCommand, IResult>
{
    private const string BillNotFound = "Bill not found.";
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(UpdateBillAttachmentCommand command, CancellationToken ct = default)
    {
        var billExists = await billRepository.Query()
            .AnyAsync(b => b.Id == command.BillId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!billExists)
            return Results.NotFound(BillNotFound);

        var attachment = await attachmentRepository.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.DeletedOn == null && a.BillId == command.BillId, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        attachment.Name = command.Name;
        attachment.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
