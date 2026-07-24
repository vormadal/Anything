using System.Text;
using System.Text.Json;

namespace Anything.Core.Notes;

/// <summary>
/// Helpers for the rich-text body of a <see cref="Anything.Core.Entities.Note"/>.
/// </summary>
/// <remarks>
/// The body is a ProseMirror/Tiptap document: a tree of nodes where a text node
/// carries a <c>text</c> string and every other node may carry a <c>content</c>
/// array of children. Flattening happens on the server rather than trusting a
/// client-supplied plain-text copy, so the search index stays correct no matter
/// which client wrote the note.
/// </remarks>
public static class NoteContent
{
    private const string ContentProperty = "content";
    private const string TextProperty = "text";
    private const string TypeProperty = "type";
    private const string AttrsProperty = "attrs";
    private const string LabelAttribute = "label";

    /// <summary>Node types that separate their text from the surrounding text with a space when flattened.</summary>
    private static readonly HashSet<string> BlockNodeTypes =
        new(StringComparer.Ordinal) { "paragraph", "heading", "listItem", "blockquote", "codeBlock", "taskItem" };

    /// <summary>
    /// Flattens an editor document into plain text. Returns an empty string for
    /// null, blank, or malformed input — a note whose body can't be parsed is
    /// still a valid note, it just contributes nothing but its title to search.
    /// </summary>
    public static string ExtractPlainText(string? contentJson)
    {
        if (string.IsNullOrWhiteSpace(contentJson))
            return string.Empty;

        try
        {
            using var document = JsonDocument.Parse(contentJson);
            var builder = new StringBuilder();
            AppendNode(document.RootElement, builder);
            return NormalizeWhitespace(builder.ToString());
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private static void AppendNode(JsonElement element, StringBuilder builder)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                    AppendNode(item, builder);
                return;
            case JsonValueKind.Object:
                AppendObjectNode(element, builder);
                return;
            default:
                return;
        }
    }

    private static void AppendObjectNode(JsonElement element, StringBuilder builder)
    {
        if (element.TryGetProperty(TextProperty, out var text) && text.ValueKind == JsonValueKind.String)
            builder.Append(text.GetString()).Append(' ');

        // Reference-style nodes (mentions, entity links) carry no text child —
        // their human-readable form lives in attrs.label, so surface that too.
        if (element.TryGetProperty(AttrsProperty, out var attrs) &&
            attrs.ValueKind == JsonValueKind.Object &&
            attrs.TryGetProperty(LabelAttribute, out var label) &&
            label.ValueKind == JsonValueKind.String)
        {
            builder.Append(label.GetString()).Append(' ');
        }

        if (element.TryGetProperty(ContentProperty, out var content))
            AppendNode(content, builder);

        if (IsBlockNode(element))
            builder.Append(' ');
    }

    private static bool IsBlockNode(JsonElement element) =>
        element.TryGetProperty(TypeProperty, out var type) &&
        type.ValueKind == JsonValueKind.String &&
        BlockNodeTypes.Contains(type.GetString()!);

    private static string NormalizeWhitespace(string value) =>
        string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
