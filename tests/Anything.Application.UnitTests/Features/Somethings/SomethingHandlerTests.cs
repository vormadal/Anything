using Anything.Application.Features.Somethings.Commands;
using Anything.Application.Features.Somethings.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Somethings;

public class CreateSomethingHandlerTests
{
    private readonly IRepository<Something> _repo = Substitute.For<IRepository<Something>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateSomethingHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesEntityWithNameAndTimestamp()
    {
        var handler = new CreateSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new CreateSomethingCommand("My List"), TestContext.Current.CancellationToken);

        Assert.Equal("My List", result.Name);
        Assert.NotEqual(default, result.CreatedOn);
        _repo.Received(1).Add(Arg.Is<Something>(s => s.Name == "My List"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateSomethingHandlerTests
{
    private readonly IRepository<Something> _repo = Substitute.For<IRepository<Something>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateSomethingHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Something?)null);
        var handler = new UpdateSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new UpdateSomethingCommand(1, "New"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Something { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new UpdateSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new UpdateSomethingCommand(1, "New"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndModifiedOn()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Something { Id = 1, Name = "Old" };
        _repo.GetById(1).Returns(entity);
        var handler = new UpdateSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new UpdateSomethingCommand(1, "New"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteSomethingHandlerTests
{
    private readonly IRepository<Something> _repo = Substitute.For<IRepository<Something>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public DeleteSomethingHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Something?)null);
        var handler = new DeleteSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new DeleteSomethingCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Something { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new DeleteSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new DeleteSomethingCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Something { Id = 1, Name = "X" };
        _repo.GetById(1).Returns(entity);
        var handler = new DeleteSomethingHandler(_repo, _unitOfWork, _timeProvider, _householdContext);

        var result = await handler.Handle(new DeleteSomethingCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetSomethingsHandlerTests
{
    private readonly IRepository<Something> _repo = Substitute.For<IRepository<Something>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<Something>
        {
            new() { Id = 1, Name = "Active" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var handler = new GetSomethingsHandler(_repo, _householdContext);
        var result = await handler.Handle(new GetSomethingsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }
}

public class GetSomethingByIdHandlerTests
{
    private readonly IRepository<Something> _repo = Substitute.For<IRepository<Something>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Something?)null);
        var handler = new GetSomethingByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetSomethingByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Something { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new GetSomethingByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetSomethingByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOkWithEntity()
    {
        var entity = new Something { Id = 1, Name = "My List" };
        _repo.GetById(1).Returns(entity);
        var handler = new GetSomethingByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetSomethingByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<Something>>(result);
        Assert.Equal("My List", ok.Value!.Name);
    }
}
