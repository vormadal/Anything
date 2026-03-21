using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Bills.Queries;

public record DownloadBillAttachmentQuery(int BillId, int AttachmentId) : IRequest<IResult>;

public class DownloadBillAttachmentHandler(
    IRepository<BillAttachment> attachmentRepository,
    IImageStorageService imageStorageService) : IRequestHandler<DownloadBillAttachmentQuery, IResult>
{
    private const string AttachmentNotFound = "Attachment not found.";

    public async Task<IResult> Handle(DownloadBillAttachmentQuery query, CancellationToken ct = default)
    {
        var attachment = await attachmentRepository.GetById(query.AttachmentId);
        if (attachment is null || attachment.DeletedOn != null || attachment.BillId != query.BillId)
            return Results.NotFound(AttachmentNotFound);

        var stream = await imageStorageService.GetFileStream(attachment.StorageKey, ct);
        return Results.Stream(stream, attachment.ContentType, attachment.Name);
    }
}
