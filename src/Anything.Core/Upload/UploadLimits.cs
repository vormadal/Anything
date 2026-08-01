namespace Anything.Core.Upload;

/// <summary>
/// Shared file-size limits for every upload endpoint (inventory/bill
/// attachments, recipe images, note images), mirroring the layered-limit
/// pattern <see cref="Anything.Core.Search.SearchDocumentLimits"/> takes for
/// search documents.
/// </summary>
/// <remarks>
/// The two limits are deliberately different sizes. Setting the transport
/// limit (Kestrel's <c>MaxRequestBodySize</c>, nginx's
/// <c>client_max_body_size</c>) at exactly <see cref="MaxFileSizeBytes"/>
/// means an oversized upload never reaches a handler — Kestrel/nginx reject it
/// first with a bodyless 413. Giving the transport layer headroom via
/// <see cref="MaxRequestBodyBytes"/> lets the request reach the handler, which
/// enforces <see cref="MaxFileSizeBytes"/> itself and returns a proper 400
/// with <see cref="FileTooLargeMessage"/> instead.
/// </remarks>
public static class UploadLimits
{
    public const int MaxFileSizeBytes = 10 * 1024 * 1024;
    public const int MaxRequestBodyBytes = 12 * 1024 * 1024;

    public const string EmptyFileMessage = "No file uploaded or file is empty.";
    public const string FileTooLargeMessage = "File is too large. Maximum allowed size is 10 MB.";

    /// <summary>Whether an upload's declared content length exceeds <see cref="MaxFileSizeBytes"/>.</summary>
    public static bool ExceedsMaxFileSize(long contentLength) => contentLength > MaxFileSizeBytes;
}
