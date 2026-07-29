using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryStorageUnitAttachmentCommand(int StorageUnitId, int AttachmentId) : IRequest<IResult>;

public class DeleteInventoryStorageUnitAttachmentHandler(
    IRepository<InventoryStorageUnit> storageUnitRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteInventoryStorageUnitAttachmentCommand, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteInventoryStorageUnitAttachmentCommand command, CancellationToken ct = default)
    {
        var storageUnitExists = await storageUnitRepository.Query()
            .AnyAsync(s => s.Id == command.StorageUnitId && s.DeletedOn == null && s.HouseholdId == householdContext.HouseholdId, ct);
        if (!storageUnitExists)
            return Results.NotFound(AttachmentNotFound);

        var attachment = await attachmentRepository.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.StorageUnitId == command.StorageUnitId && a.DeletedOn == null, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
