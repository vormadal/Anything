using Anything.Application.Features.SuggestionCategories.Commands;
using Anything.Application.Features.SuggestionCategories.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.SuggestionCategories;

public class CreateSuggestionCategoryHandlerTests
{
    private readonly IRepository<SuggestionCategory> _repo = Substitute.For<IRepository<SuggestionCategory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateSuggestionCategoryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
        _repo.Query().Returns(new List<SuggestionCategory>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_CreatesCategoryWithNameAndSortOrder()
    {
        var handler = new CreateSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateSuggestionCategoryCommand("Dairy"), TestContext.Current.CancellationToken);

        Assert.IsType<Created<SuggestionCategory>>(result);
        var created = (Created<SuggestionCategory>)result;
        Assert.Equal("Dairy", created.Value!.Name);
        Assert.Equal(0, created.Value.SortOrder);
        _repo.Received(1).Add(Arg.Is<SuggestionCategory>(c => c.Name == "Dairy"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsCreatedOnTimestamp()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var handler = new CreateSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateSuggestionCategoryCommand("Produce"), TestContext.Current.CancellationToken);

        var created = (Created<SuggestionCategory>)result;
        Assert.Equal(now.UtcDateTime, created.Value!.CreatedOn);
    }
}

public class UpdateSuggestionCategoryHandlerTests
{
    private readonly IRepository<SuggestionCategory> _repo = Substitute.For<IRepository<SuggestionCategory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateSuggestionCategoryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<SuggestionCategory>().AsAsyncQueryable());
        var handler = new UpdateSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateSuggestionCategoryCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<SuggestionCategory> { new SuggestionCategory { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow } }.AsAsyncQueryable());
        var handler = new UpdateSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateSuggestionCategoryCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndModifiedOn()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new SuggestionCategory { Id = 1, Name = "Old Name" };
        _repo.Query().Returns(new List<SuggestionCategory> { entity }.AsAsyncQueryable());
        var handler = new UpdateSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateSuggestionCategoryCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", entity.Name);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteSuggestionCategoryHandlerTests
{
    private readonly IRepository<SuggestionCategory> _repo = Substitute.For<IRepository<SuggestionCategory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public DeleteSuggestionCategoryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<SuggestionCategory>().AsAsyncQueryable());
        var handler = new DeleteSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteSuggestionCategoryCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<SuggestionCategory> { new SuggestionCategory { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow } }.AsAsyncQueryable());
        var handler = new DeleteSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteSuggestionCategoryCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletesCategory()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new SuggestionCategory { Id = 1, Name = "X" };
        _repo.Query().Returns(new List<SuggestionCategory> { entity }.AsAsyncQueryable());
        var handler = new DeleteSuggestionCategoryHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteSuggestionCategoryCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
