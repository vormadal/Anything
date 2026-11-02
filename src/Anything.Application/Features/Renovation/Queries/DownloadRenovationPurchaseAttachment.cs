using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Queries;

public record DownloadRenovationPurchaseAttachmentQuery(int ProjectId, int PurchaseId, int AttachmentId) : IRequest<IResult>;

public class DownloadRenovationPurchaseAttachmentHandler(
    RenovationRepositories repos,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<DownloadRenovationPurchaseAttachmentQuery, IResult>
{
    private const string PurchaseNotFound = "Purchase not found.";
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DownloadRenovationPurchaseAttachmentQuery query, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        if (!await RenovationPurchaseLookup.PurchaseExists(repos, householdId, query.ProjectId, query.PurchaseId, ct))
            return Results.NotFound(PurchaseNotFound);

        var attachment = await repos.PurchaseAttachments.Query().AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == query.AttachmentId && a.PurchaseId == query.PurchaseId
                                      && a.HouseholdId == householdId && a.DeletedOn == null, ct);
        if (attachment is null)
            return Results.NotFound(AttachmentNotFound);

        var stream = await imageStorageService.GetFileStream(attachment.StorageKey, ct);
        return Results.Stream(stream, attachment.ContentType, attachment.Name);
    }
}
