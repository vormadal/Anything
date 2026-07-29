using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryBoxAttachmentCommand(int BoxId, int AttachmentId) : IRequest<IResult>;

public class DeleteInventoryBoxAttachmentHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteInventoryBoxAttachmentCommand, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteInventoryBoxAttachmentCommand command, CancellationToken ct = default)
    {
        var boxExists = await boxRepository.Query()
            .AnyAsync(b => b.Id == command.BoxId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!boxExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.BoxId == command.BoxId && a.DeletedOn == null, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
