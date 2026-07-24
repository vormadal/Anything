namespace Anything.Contracts.Notes;

/// <summary>A single note including its full rich-text body.</summary>
public record NoteResponse(
    int Id,
    string Title,
    string? ContentJson,
    string? ContentText,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
