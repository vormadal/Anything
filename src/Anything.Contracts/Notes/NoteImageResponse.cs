namespace Anything.Contracts.Notes;

/// <summary>
/// An image uploaded for use inside a note body.
/// </summary>
/// <remarks>
/// Note images are not a table of their own — the reference lives in the note's
/// editor document, so both values are stored on the image node's attributes:
/// <paramref name="Url"/> is what the editor renders, and <paramref name="StorageKey"/>
/// lets the URL be re-derived should the image proxy's configuration ever change.
/// </remarks>
public record NoteImageResponse(string StorageKey, string Url);
