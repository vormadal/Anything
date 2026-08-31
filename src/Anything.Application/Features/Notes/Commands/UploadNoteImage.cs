using Anything.Application.Common;
using Anything.Contracts.Notes;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Notes.Commands;

public record UploadNoteImageCommand(
    Stream ImageStream,
    string FileName,
    string ContentType,
    long ContentLength) : IRequest<IResult>;

/// <summary>
/// Stores an image for a note body and hands back the URL to embed in it.
/// </summary>
/// <remarks>
/// Deliberately not scoped to a note id. A note is only created once its first
/// line is finished (see the frontend's autosave), so an id-scoped upload could
/// not accept an image dropped into a note that is still being started, and the
/// Samsung Notes importer would need a create/upload/update round-trip per note.
/// The cost is that an image uploaded into a note the user then abandons is left
/// unreferenced in storage — the same trade-off recipe images already make.
/// </remarks>
public class UploadNoteImageHandler(IImageStorageService imageStorageService)
    : IRequestHandler<UploadNoteImageCommand, IResult>
{
    private const string StorageFolder = "notes";

    /// <summary>
    /// How large the embedded image is rendered at most. Notes are read on phones,
    /// so this is a display bound, not the size of the stored original.
    /// </summary>
    private const int MaxRenderedDimension = 1600;

    public async Task<IResult> Handle(UploadNoteImageCommand command, CancellationToken ct = default)
    {
        if (UploadValidation.ValidateFileSize(command.ContentLength) is { } sizeError)
            return sizeError;

        if (UploadValidation.ValidateImageContentType(command.ContentType) is { } typeError)
            return typeError;

        var storageKey = await imageStorageService.Upload(
            command.ImageStream,
            command.FileName,
            command.ContentType,
            command.ContentLength,
            ct,
            folder: StorageFolder);

        var url = imageStorageService.GetImageUrl(
            storageKey,
            MaxRenderedDimension,
            MaxRenderedDimension,
            resizingType: "fit");

        return Results.Created(url, new NoteImageResponse(storageKey, url));
    }
}
