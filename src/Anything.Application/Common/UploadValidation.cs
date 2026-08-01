using Anything.Core.Upload;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Common;

/// <summary>
/// Shared empty-file/oversized-file validation for every upload handler
/// (inventory/bill attachments, recipe and note images). <see cref="UploadLimits"/>
/// lives in <c>Anything.Core</c>, which has no dependencies and so cannot
/// return an <see cref="IResult"/> itself — this is the one place that turns
/// its limits into the response each handler returns.
/// </summary>
public static class UploadValidation
{
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
}
