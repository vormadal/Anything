using Anything.Core.Upload;

namespace Anything.API.Endpoints;

/// <summary>
/// Shared "was a file actually sent" guard for the six multipart upload
/// endpoints, run before an <see cref="IFormFile"/> is unwrapped into the
/// stream/metadata primitives each Upload*Command expects.
/// </summary>
internal static class UploadEndpointValidation
{
    public static IResult? ValidateFile(IFormFile? file) =>
        file is null || file.Length == 0
            ? Results.BadRequest(UploadLimits.EmptyFileMessage)
            : null;
}
