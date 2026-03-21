namespace Anything.Contracts.Bills;

public record BillAttachmentResponse(
    int Id,
    int BillId,
    string Name,
    string ContentType,
    string Url,
    string? ThumbnailUrl,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
