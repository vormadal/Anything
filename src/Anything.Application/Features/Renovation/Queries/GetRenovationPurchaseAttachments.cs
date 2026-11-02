using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Queries;

public record GetRenovationPurchaseAttachmentsQuery(int ProjectId, int PurchaseId) : IRequest<IResult>;

public class GetRenovationPurchaseAttachmentsHandler(
    RenovationRepositories repos,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<GetRenovationPurchaseAttachmentsQuery, IResult>
{
    private const string PurchaseNotFound = "Purchase not found.";

    public async Task<IResult> Handle(GetRenovationPurchaseAttachmentsQuery query, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        if (!await RenovationPurchaseLookup.PurchaseExists(repos, householdId, query.ProjectId, query.PurchaseId, ct))
            return Results.NotFound(PurchaseNotFound);

        var attachments = await repos.PurchaseAttachments.Query().AsNoTracking()
            .Where(a => a.PurchaseId == query.PurchaseId && a.HouseholdId == householdId && a.DeletedOn == null)
            .OrderBy(a => a.Id)
            .ToListAsync(ct);

        return Results.Ok(attachments.Select(a => ToResponse(a, query.ProjectId, imageStorageService)).ToList());
    }

    // Images get imgproxy URLs; anything else is served through the download endpoint, as bill attachments are.
    private static RenovationPurchaseAttachmentResponse ToResponse(
        RenovationPurchaseAttachment a, int projectId, IImageStorageService imageStorageService)
    {
        if (a.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return new RenovationPurchaseAttachmentResponse(
                a.Id, a.PurchaseId, a.Name, a.ContentType, a.Size,
                imageStorageService.GetImageUrl(a.StorageKey, 1920, 1080, "fit"),
                imageStorageService.GetImageUrl(a.StorageKey, 150, 150, "fill"),
                a.CreatedOn, a.ModifiedOn);
        }

        return new RenovationPurchaseAttachmentResponse(
            a.Id, a.PurchaseId, a.Name, a.ContentType, a.Size,
            $"/api/renovation-projects/{projectId}/purchases/{a.PurchaseId}/attachments/{a.Id}/download",
            null,
            a.CreatedOn, a.ModifiedOn);
    }
}
