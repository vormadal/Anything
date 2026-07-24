using Anything.Core.Search;

namespace Anything.Core.Entities;

/// <summary>
/// A free-form rich-text note belonging to a household.
/// </summary>
/// <remarks>
/// The body is stored twice on purpose. <see cref="ContentJson"/> is the
/// editor's own document model (ProseMirror/Tiptap JSON) and is the source of
/// truth for rendering; <see cref="ContentText"/> is the flattened plain-text
/// projection of that document, derived server-side by
/// <see cref="Anything.Core.Notes.NoteContent.ExtractPlainText"/> on every write.
/// Keeping the flattened copy on the row means search indexing and list
/// snippets never have to parse the editor document, so adding new node types
/// later (e.g. a node referencing a recipe or a shopping list) only requires
/// teaching the extractor how to flatten that node — nothing else changes.
/// </remarks>
public class Note : ISearchable
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public required string Title { get; set; }

    /// <summary>The editor document, serialised as JSON. Opaque to the backend apart from text extraction.</summary>
    public string? ContentJson { get; set; }

    /// <summary>Flattened plain text of <see cref="ContentJson"/>, used for search and list snippets.</summary>
    public string? ContentText { get; set; }

    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }

    string ISearchable.SearchEntityType => SearchEntityTypes.Note;
    int ISearchable.SearchEntityId => Id;
    string ISearchable.SearchTitle => Title;
    string ISearchable.SearchContent =>
        string.IsNullOrWhiteSpace(ContentText) ? Title : $"{Title} {ContentText}";
}
