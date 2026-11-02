namespace Anything.Contracts.Renovation;

public record RenovationPurchaseAttachmentResponse(
    int Id,
    int PurchaseId,
    string Name,
    string ContentType,
    long Size,
    string Url,
    string? ThumbnailUrl,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
