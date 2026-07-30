using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryItemAttachmentCommand(int ItemId, int AttachmentId) : IRequest<IResult>;

public class DeleteInventoryItemAttachmentHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteInventoryItemAttachmentCommand, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteInventoryItemAttachmentCommand command, CancellationToken ct = default)
    {
        var itemExists = await itemRepository.Query()
            .AnyAsync(i => i.Id == command.ItemId && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId, ct);
        if (!itemExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.ItemId == command.ItemId && a.DeletedOn == null, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
