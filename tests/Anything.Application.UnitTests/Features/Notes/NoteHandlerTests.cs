using Anything.Application.Features.Notes;
using Anything.Application.Features.Notes.Commands;
using Anything.Application.Features.Notes.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Notes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Search;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Notes;

/// <summary>Shared fakes for the note handler tests.</summary>
public abstract class NoteHandlerTestBase
{
    protected const int HouseholdId = 7;
    protected static readonly DateTimeOffset Now = new(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);

    /// <summary>A minimal Tiptap document — one paragraph with a single text node.</summary>
    protected const string SimpleDoc =
        """{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Buy milk"}]}]}""";

    protected readonly IRepository<Note> Repository = Substitute.For<IRepository<Note>>();
    protected readonly IUnitOfWork UnitOfWork = Substitute.For<IUnitOfWork>();
    protected readonly TimeProvider Time = Substitute.For<TimeProvider>();
    protected readonly IHouseholdContext HouseholdContext = Substitute.For<IHouseholdContext>();

    protected NoteHandlerTestBase()
    {
        Time.GetUtcNow().Returns(Now);
        HouseholdContext.HouseholdId.Returns(HouseholdId);
    }
}

public class CreateNoteHandlerTests : NoteHandlerTestBase
{
    [Fact]
    public async Task Handle_StoresTitleContentAndHousehold()
    {
        var handler = new CreateNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(
            new CreateNoteCommand("Groceries", SimpleDoc), TestContext.Current.CancellationToken);

        Assert.Equal("Groceries", result.Title);
        Assert.Equal(SimpleDoc, result.ContentJson);
        Assert.Equal(Now.UtcDateTime, result.CreatedOn);
        Repository.Received(1).Add(Arg.Is<Note>(n => n.HouseholdId == HouseholdId && n.Title == "Groceries"));
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DerivesPlainTextFromEditorDocument()
    {
        var handler = new CreateNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(
            new CreateNoteCommand("Groceries", SimpleDoc), TestContext.Current.CancellationToken);

        Assert.Equal("Buy milk", result.ContentText);
    }
}

public class UpdateNoteHandlerTests : NoteHandlerTestBase
{
    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        Repository.Query().Returns(new List<Note>().AsAsyncQueryable());
        var handler = new UpdateNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(
            new UpdateNoteCommand(1, "New", null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenOtherHousehold_ReturnsNotFound()
    {
        Repository.Query().Returns(new List<Note>
        {
            new() { Id = 1, HouseholdId = HouseholdId + 1, Title = "Theirs" }
        }.AsAsyncQueryable());
        var handler = new UpdateNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(
            new UpdateNoteCommand(1, "New", null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ReplacesTitleContentAndRederivesPlainText()
    {
        var note = new Note
        {
            Id = 1,
            HouseholdId = HouseholdId,
            Title = "Old",
            ContentJson = null,
            ContentText = "stale",
        };
        Repository.Query().Returns(new List<Note> { note }.AsAsyncQueryable());
        var handler = new UpdateNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(
            new UpdateNoteCommand(1, "New", SimpleDoc), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", note.Title);
        Assert.Equal(SimpleDoc, note.ContentJson);
        Assert.Equal("Buy milk", note.ContentText);
        Assert.Equal(Now.UtcDateTime, note.ModifiedOn);
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteNoteHandlerTests : NoteHandlerTestBase
{
    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        Repository.Query().Returns(new List<Note>
        {
            new() { Id = 1, HouseholdId = HouseholdId, Title = "X", DeletedOn = Now.UtcDateTime }
        }.AsAsyncQueryable());
        var handler = new DeleteNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(new DeleteNoteCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletes()
    {
        var note = new Note { Id = 1, HouseholdId = HouseholdId, Title = "X" };
        Repository.Query().Returns(new List<Note> { note }.AsAsyncQueryable());
        var handler = new DeleteNoteHandler(Repository, UnitOfWork, Time, HouseholdContext);

        var result = await handler.Handle(new DeleteNoteCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(Now.UtcDateTime, note.DeletedOn);
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetNotesHandlerTests : NoteHandlerTestBase
{
    private static List<Note> SampleNotes() =>
    [
        new() { Id = 1, HouseholdId = HouseholdId, Title = "Oldest", CreatedOn = Now.UtcDateTime.AddDays(-3) },
        new() { Id = 2, HouseholdId = HouseholdId, Title = "Newest", CreatedOn = Now.UtcDateTime.AddDays(-2), ModifiedOn = Now.UtcDateTime },
        new() { Id = 3, HouseholdId = HouseholdId, Title = "Middle", CreatedOn = Now.UtcDateTime.AddDays(-1) },
        new() { Id = 4, HouseholdId = HouseholdId, Title = "Deleted", CreatedOn = Now.UtcDateTime, DeletedOn = Now.UtcDateTime },
        new() { Id = 5, HouseholdId = HouseholdId + 1, Title = "Other household", CreatedOn = Now.UtcDateTime },
    ];

    [Fact]
    public async Task Handle_ReturnsOwnHouseholdsLiveNotesNewestFirst()
    {
        Repository.Query().Returns(SampleNotes().AsAsyncQueryable());
        var handler = new GetNotesHandler(Repository, HouseholdContext);

        var result = await handler.Handle(new GetNotesQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(["Newest", "Middle", "Oldest"], result.Select(n => n.Title));
    }

    [Fact]
    public async Task Handle_WhenLimitGiven_TakesOnlyThatMany()
    {
        Repository.Query().Returns(SampleNotes().AsAsyncQueryable());
        var handler = new GetNotesHandler(Repository, HouseholdContext);

        var result = await handler.Handle(new GetNotesQuery(2), TestContext.Current.CancellationToken);

        Assert.Equal(["Newest", "Middle"], result.Select(n => n.Title));
    }

    [Fact]
    public async Task Handle_TruncatesLongSnippet()
    {
        var longText = new string('a', NoteMapping.SnippetLength + 50);
        Repository.Query().Returns(new List<Note>
        {
            new() { Id = 1, HouseholdId = HouseholdId, Title = "Long", ContentText = longText }
        }.AsAsyncQueryable());
        var handler = new GetNotesHandler(Repository, HouseholdContext);

        var result = await handler.Handle(new GetNotesQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(NoteMapping.SnippetLength + 1, result[0].Snippet!.Length);
        Assert.EndsWith("…", result[0].Snippet);
    }
}

public class GetNoteByIdHandlerTests : NoteHandlerTestBase
{
    [Fact]
    public async Task Handle_WhenOtherHousehold_ReturnsNull()
    {
        Repository.Query().Returns(new List<Note>
        {
            new() { Id = 1, HouseholdId = HouseholdId + 1, Title = "Theirs" }
        }.AsAsyncQueryable());
        var handler = new GetNoteByIdHandler(Repository, HouseholdContext);

        var result = await handler.Handle(new GetNoteByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.Null(result);
    }

    [Fact]
    public async Task Handle_ReturnsFullBody()
    {
        Repository.Query().Returns(new List<Note>
        {
            new() { Id = 1, HouseholdId = HouseholdId, Title = "Mine", ContentJson = SimpleDoc, ContentText = "Buy milk" }
        }.AsAsyncQueryable());
        var handler = new GetNoteByIdHandler(Repository, HouseholdContext);

        var result = await handler.Handle(new GetNoteByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.NotNull(result);
        Assert.Equal(SimpleDoc, result.ContentJson);
    }
}

public class UploadNoteImageHandlerTests
{
    private readonly IImageStorageService _storageService = Substitute.For<IImageStorageService>();

    private UploadNoteImageHandler CreateHandler() => new(_storageService);

    [Fact]
    public async Task Handle_EmptyFile_ReturnsBadRequest()
    {
        var command = new UploadNoteImageCommand(Stream.Null, "photo.png", "image/png", 0);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_DisallowedContentType_ReturnsBadRequest()
    {
        var command = new UploadNoteImageCommand(new MemoryStream(new byte[10]), "notes.pdf", "application/pdf", 10);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidUpload_ReturnsCreatedWithUrl()
    {
        _storageService
            .Upload(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<long>(), Arg.Any<CancellationToken>(), Arg.Any<string>())
            .Returns("notes/test.png");
        _storageService.GetImageUrl("notes/test.png", 1600, 1600, "fit").Returns("https://images.example/notes/test.png");

        var command = new UploadNoteImageCommand(new MemoryStream(new byte[10]), "photo.png", "image/png", 10);
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        var created = Assert.IsType<Created<NoteImageResponse>>(result);
        Assert.Equal("notes/test.png", created.Value!.StorageKey);
        Assert.Equal("https://images.example/notes/test.png", created.Value.Url);
        await _storageService.Received(1).Upload(
            Arg.Any<Stream>(), "photo.png", "image/png", 10, Arg.Any<CancellationToken>(), "notes");
    }

    [Fact]
    public async Task Handle_ContentTypeWithParameters_IsAllowed()
    {
        _storageService
            .Upload(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<long>(), Arg.Any<CancellationToken>(), Arg.Any<string>())
            .Returns("notes/test.jpg");

        var command = new UploadNoteImageCommand(new MemoryStream(new byte[10]), "photo.jpg", "image/jpeg; charset=binary", 10);
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<Created<NoteImageResponse>>(result);
    }
}

public class NoteSearchProjectionTests : NoteHandlerTestBase
{
    [Fact]
    public void SearchContent_CombinesTitleAndPlainText()
    {
        ISearchable note = new Note { Id = 1, HouseholdId = HouseholdId, Title = "Groceries", ContentText = "Buy milk" };

        Assert.Equal(SearchEntityTypes.Note, note.SearchEntityType);
        Assert.Equal(1, note.SearchEntityId);
        Assert.Equal("Groceries", note.SearchTitle);
        Assert.Equal("Groceries Buy milk", note.SearchContent);
    }

    [Fact]
    public void SearchContent_WhenBodyEmpty_FallsBackToTitle()
    {
        ISearchable note = new Note { Id = 1, HouseholdId = HouseholdId, Title = "Groceries", ContentText = "  " };

        Assert.Equal("Groceries", note.SearchContent);
    }
}
