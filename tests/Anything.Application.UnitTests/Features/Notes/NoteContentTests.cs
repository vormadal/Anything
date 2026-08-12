using Anything.Core.Notes;
using Xunit;

namespace Anything.Application.UnitTests.Features.Notes;

public class NoteContentTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ExtractPlainText_WhenNoDocument_ReturnsEmpty(string? json)
    {
        Assert.Equal(string.Empty, NoteContent.ExtractPlainText(json));
    }

    [Fact]
    public void ExtractPlainText_WhenMalformed_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, NoteContent.ExtractPlainText("{not json"));
    }

    [Fact]
    public void ExtractPlainText_FlattensNestedNodes()
    {
        const string doc = """
        {"type":"doc","content":[
            {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Shopping"}]},
            {"type":"bulletList","content":[
                {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Milk"}]}]},
                {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Eggs"}]}]}
            ]}
        ]}
        """;

        Assert.Equal("Shopping Milk Eggs", NoteContent.ExtractPlainText(doc));
    }

    [Fact]
    public void ExtractPlainText_KeepsMarkedTextInOrder()
    {
        const string doc = """
        {"type":"doc","content":[{"type":"paragraph","content":[
            {"type":"text","text":"Really "},
            {"type":"text","marks":[{"type":"bold"}],"text":"important"},
            {"type":"text","text":" note"}
        ]}]}
        """;

        Assert.Equal("Really important note", NoteContent.ExtractPlainText(doc));
    }

    // Guards the extension point: a future node that references another entity
    // carries no text child, only attrs — its label must still reach the index.
    [Fact]
    public void ExtractPlainText_IncludesReferenceNodeLabels()
    {
        const string doc = """
        {"type":"doc","content":[{"type":"paragraph","content":[
            {"type":"text","text":"Cook "},
            {"type":"entityReference","attrs":{"entityType":"Recipe","entityId":12,"label":"Lasagne"}}
        ]}]}
        """;

        Assert.Equal("Cook Lasagne", NoteContent.ExtractPlainText(doc));
    }

    // The frontend's `listEmbed` node is that extension point in production use:
    // it stores a list reference, not the list's items, so its `label` is the
    // only thing that can keep the note findable by the list's name.
    [Fact]
    public void ExtractPlainText_IncludesEmbeddedListLabels()
    {
        const string doc = """
        {"type":"doc","content":[
            {"type":"paragraph","content":[{"type":"text","text":"Pick up:"}]},
            {"type":"listEmbed","attrs":{"listId":7,"label":"Weekly Groceries"}}
        ]}
        """;

        Assert.Equal("Pick up: Weekly Groceries", NoteContent.ExtractPlainText(doc));
    }

    [Fact]
    public void ExtractPlainText_CollapsesWhitespaceBetweenBlocks()
    {
        const string doc = """
        {"type":"doc","content":[
            {"type":"paragraph","content":[{"type":"text","text":"One"}]},
            {"type":"paragraph"},
            {"type":"paragraph","content":[{"type":"text","text":"Two"}]}
        ]}
        """;

        Assert.Equal("One Two", NoteContent.ExtractPlainText(doc));
    }
}
