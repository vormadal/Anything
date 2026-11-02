using Anything.Core.Storage;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Anything.API.Middleware;

/// <summary>
/// Maps <see cref="StorageUnavailableException"/> to a 503 ProblemDetails, so
/// every upload/delete endpoint reports a broken object store the same way
/// instead of as an unhandled 500. The underlying error is already logged by
/// the storage service; the response deliberately carries no internals.
/// </summary>
public sealed class StorageUnavailableExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not StorageUnavailableException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "File storage is unavailable",
                Detail = "The file could not be stored or removed right now. Please try again later.",
            },
        });
    }
}
