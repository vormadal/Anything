using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record DeleteRenovationPurchaseAttachmentCommand(int ProjectId, int PurchaseId, int AttachmentId) : IRequest<IResult>;

public class DeleteRenovationPurchaseAttachmentHandler(
    RenovationRepositories repos,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRenovationPurchaseAttachmentCommand, IResult>
{
    private const string PurchaseNotFound = "Purchase not found.";
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DeleteRenovationPurchaseAttachmentCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        if (!await RenovationPurchaseLookup.PurchaseExists(repos, householdId, command.ProjectId, command.PurchaseId, ct))
            return Results.NotFound(PurchaseNotFound);

        var attachment = await repos.PurchaseAttachments.Query()
            .FirstOrDefaultAsync(a => a.Id == command.AttachmentId && a.PurchaseId == command.PurchaseId
                                      && a.HouseholdId == householdId && a.DeletedOn == null, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        await imageStorageService.Delete(attachment.StorageKey, ct);

        attachment.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
