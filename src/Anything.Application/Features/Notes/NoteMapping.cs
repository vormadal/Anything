using Anything.Contracts.Notes;
using Anything.Core.Entities;

namespace Anything.Application.Features.Notes;

/// <summary>Shared entity-to-contract projections for the Notes feature.</summary>
public static class NoteMapping
{
    /// <summary>Longest plain-text preview kept on a list row.</summary>
    public const int SnippetLength = 160;

    public static NoteResponse ToResponse(Note note) =>
        new(note.Id, note.Title, note.ContentJson, note.ContentText, note.CreatedOn, note.ModifiedOn);

    public static NoteSummaryResponse ToSummary(Note note) =>
        new(note.Id, note.Title, ToSnippet(note.ContentText), note.CreatedOn, note.ModifiedOn);

    private static string? ToSnippet(string? contentText)
    {
        if (string.IsNullOrWhiteSpace(contentText))
            return null;

        return contentText.Length <= SnippetLength
            ? contentText
            : contentText[..SnippetLength].TrimEnd() + "…";
    }
}
