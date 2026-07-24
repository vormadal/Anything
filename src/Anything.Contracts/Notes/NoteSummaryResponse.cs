namespace Anything.Contracts.Notes;

/// <summary>
/// A note as shown in lists and on the home card: no editor document, just a
/// short plain-text preview, so listing many notes stays cheap.
/// </summary>
public record NoteSummaryResponse(
    int Id,
    string Title,
    string? Snippet,
    DateTime CreatedOn,
    DateTime? ModifiedOn);
