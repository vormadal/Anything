using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Queries;

public record GetBillAttachmentsQuery(int BillId) : IRequest<IResult>;

public class GetBillAttachmentsHandler(
    IRepository<Bill> billRepository,
    IRepository<BillAttachment> attachmentRepository,
    IImageStorageService imageStorageService) : IRequestHandler<GetBillAttachmentsQuery, IResult>
{
    private const string BillNotFound = "Bill not found.";

    private static bool IsImage(string contentType) =>
        contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

    public async Task<IResult> Handle(GetBillAttachmentsQuery query, CancellationToken ct = default)
    {
        var bill = await billRepository.GetById(query.BillId);
        if (bill is null || bill.DeletedOn != null)
            return Results.NotFound(BillNotFound);

        var attachments = await attachmentRepository.Query()
            .Where(a => a.BillId == query.BillId && a.DeletedOn == null)
            .ToListAsync(ct);

        var response = attachments.Select(a =>
        {
            string url;
            string? thumbnailUrl;

            if (IsImage(a.ContentType))
            {
                thumbnailUrl = imageStorageService.GetImageUrl(a.StorageKey, 150, 150, "fill");
                url = imageStorageService.GetImageUrl(a.StorageKey, 1920, 1080, "fit");
            }
            else
            {
                url = imageStorageService.GetFileUrl(a.StorageKey);
                thumbnailUrl = null;
            }

            return new BillAttachmentResponse(
                a.Id,
                a.BillId,
                a.Name,
                a.ContentType,
                url,
                thumbnailUrl,
                a.CreatedOn,
                a.ModifiedOn);
        });

        return Results.Ok(response);
    }
}
