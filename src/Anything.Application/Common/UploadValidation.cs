using Anything.Core.Upload;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Common;

/// <summary>
/// Shared empty-file/oversized-file and content-type validation for every
/// upload handler (inventory/bill attachments, recipe and note images).
/// <see cref="UploadLimits"/> lives in <c>Anything.Core</c>, which has no
/// dependencies and so cannot return an <see cref="IResult"/> itself — this is
/// the one place that turns its limits into the response each handler returns.
/// Content types are allowlisted because the stored value is served back
/// verbatim (and, for images, fetched by imgproxy) — a client-supplied type
/// like <c>text/html</c> must never reach storage.
/// </summary>
public static class UploadValidation
{
    public const string InvalidImageMessage =
        "Only PNG, JPEG, WebP and GIF images are allowed.";

    public const string InvalidAttachmentMessage =
        "Only images, PDFs, plain text and Word/Excel documents are allowed.";

    private static readonly string[] ImageContentTypes =
        ["image/png", "image/jpeg", "image/webp", "image/gif"];

    private static readonly string[] DocumentContentTypes =
    [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    private static readonly string[] AttachmentContentTypes =
        [.. ImageContentTypes, .. DocumentContentTypes];

    /// <summary>
    /// Validates an upload's declared content length, returning the
    /// <see cref="IResult"/> a handler should return immediately, or
    /// <c>null</c> when the length is acceptable and the handler should proceed.
    /// </summary>
    public static IResult? ValidateFileSize(long contentLength)
    {
        if (contentLength == 0)
            return Results.BadRequest(UploadLimits.EmptyFileMessage);

        if (UploadLimits.ExceedsMaxFileSize(contentLength))
            return Results.BadRequest(UploadLimits.FileTooLargeMessage);

        return null;
    }

    /// <summary>Allows raster image types only — recipe and note images.</summary>
    public static IResult? ValidateImageContentType(string contentType) =>
        Validate(contentType, ImageContentTypes, InvalidImageMessage);

    /// <summary>Allows images plus common document types — inventory and bill attachments.</summary>
    public static IResult? ValidateAttachmentContentType(string contentType) =>
        Validate(contentType, AttachmentContentTypes, InvalidAttachmentMessage);

    private static IResult? Validate(string contentType, string[] allowed, string message) =>
        IsAllowed(contentType, allowed) ? null : Results.BadRequest(message);

    private static bool IsAllowed(string contentType, string[] allowed)
    {
        // Browsers append parameters to some uploads ("image/jpeg; charset=..."),
        // so compare only the media type.
        var mediaType = contentType.Split(';')[0].Trim();
        return allowed.Contains(mediaType, StringComparer.OrdinalIgnoreCase);
    }
}
