namespace Anything.Core.Storage;

/// <summary>
/// Thrown by <see cref="Anything.Core.Services.IImageStorageService"/> when the
/// object store fails or can't be reached. The API turns it into a 503, so a
/// caller sees "storage unavailable" instead of an unhandled 500.
/// </summary>
/// <remarks>
/// Lives outside <c>Anything.Core.Services</c> because the architecture tests
/// only allow interfaces in that namespace.
/// </remarks>
public sealed class StorageUnavailableException(string message, Exception innerException)
    : Exception(message, innerException);
