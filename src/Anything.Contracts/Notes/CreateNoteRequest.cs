using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notes;

/// <summary>Creates a note. <paramref name="ContentJson"/> is the serialised rich-text editor document.</summary>
public record CreateNoteRequest(
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters.")]
    string Title,
    [StringLength(100000, ErrorMessage = "Content is too large.")]
    string? ContentJson);
