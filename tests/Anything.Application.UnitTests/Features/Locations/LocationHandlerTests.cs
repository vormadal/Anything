using Anything.Application.Features.Locations.Commands;
using Anything.Application.Features.Locations.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Locations;

public class CreateLocationHandlerTests
{
    private readonly IRepository<Location> _repo = Substitute.For<IRepository<Location>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateLocationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesEntityWithNameAndTimestamp()
    {
        var handler = new CreateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateLocationCommand("Warehouse A"), TestContext.Current.CancellationToken);

        Assert.Equal("Warehouse A", result.Name);
        Assert.NotEqual(default, result.CreatedOn);
        _repo.Received(1).Add(Arg.Is<Location>(l => l.Name == "Warehouse A"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsCreatedOnToNow()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var handler = new CreateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateLocationCommand("Store B"), TestContext.Current.CancellationToken);

        Assert.Equal(now.UtcDateTime, result.CreatedOn);
    }

    [Fact]
    public async Task Handle_ReturnsCreatedLocation()
    {
        var handler = new CreateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateLocationCommand("Depot C"), TestContext.Current.CancellationToken);

        Assert.IsType<Location>(result);
        Assert.Equal("Depot C", result.Name);
    }
}

public class UpdateLocationHandlerTests
{
    private readonly IRepository<Location> _repo = Substitute.For<IRepository<Location>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateLocationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Location?)null);
        var handler = new UpdateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateLocationCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Location { Id = 1, Name = "Old", DeletedOn = DateTime.UtcNow });
        var handler = new UpdateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateLocationCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndModifiedOn()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Location { Id = 1, Name = "Old Name" };
        _repo.GetById(1).Returns(entity);
        var handler = new UpdateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateLocationCommand(1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", entity.Name);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenFound_SavesChanges()
    {
        var entity = new Location { Id = 2, Name = "Location X" };
        _repo.GetById(2).Returns(entity);
        var handler = new UpdateLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        await handler.Handle(new UpdateLocationCommand(2, "Location Y"), TestContext.Current.CancellationToken);

        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteLocationHandlerTests
{
    private readonly IRepository<Location> _repo = Substitute.For<IRepository<Location>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public DeleteLocationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Location?)null);
        var handler = new DeleteLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteLocationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Location { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new DeleteLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteLocationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Location { Id = 1, Name = "X" };
        _repo.GetById(1).Returns(entity);
        var handler = new DeleteLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteLocationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DoesNotSaveChanges_WhenNotFound()
    {
        _repo.GetById(99).Returns((Location?)null);
        var handler = new DeleteLocationHandler(_repo, _householdContext, _unitOfWork, _timeProvider);

        await handler.Handle(new DeleteLocationCommand(99), TestContext.Current.CancellationToken);

        await _unitOfWork.DidNotReceive().SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetLocationsHandlerTests
{
    private readonly IRepository<Location> _repo = Substitute.For<IRepository<Location>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<Location>
        {
            new() { Id = 1, Name = "Active Location" },
            new() { Id = 2, Name = "Deleted Location", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var handler = new GetLocationsHandler(_repo, _householdContext);
        var result = await handler.Handle(new GetLocationsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Active Location", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyList_WhenAllDeleted()
    {
        _repo.Query().Returns(new List<Location>
        {
            new() { Id = 1, Name = "Gone", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var handler = new GetLocationsHandler(_repo, _householdContext);
        var result = await handler.Handle(new GetLocationsQuery(), TestContext.Current.CancellationToken);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsItemsOrderedByName()
    {
        _repo.Query().Returns(new List<Location>
        {
            new() { Id = 1, Name = "Zebra" },
            new() { Id = 2, Name = "Alpha" },
            new() { Id = 3, Name = "Mango" }
        }.AsAsyncQueryable());

        var handler = new GetLocationsHandler(_repo, _householdContext);
        var result = await handler.Handle(new GetLocationsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(["Alpha", "Mango", "Zebra"], result.Select(l => l.Name).ToList());
    }
}

public class GetLocationByIdHandlerTests
{
    private readonly IRepository<Location> _repo = Substitute.For<IRepository<Location>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Location?)null);
        var handler = new GetLocationByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetLocationByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Location { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new GetLocationByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetLocationByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOkWithEntity()
    {
        var entity = new Location { Id = 1, Name = "Main Warehouse" };
        _repo.GetById(1).Returns(entity);
        var handler = new GetLocationByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetLocationByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<Location>>(result);
        Assert.Equal("Main Warehouse", ok.Value!.Name);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsCorrectId()
    {
        var entity = new Location { Id = 42, Name = "Storage Unit" };
        _repo.GetById(42).Returns(entity);
        var handler = new GetLocationByIdHandler(_repo, _householdContext);

        var result = await handler.Handle(new GetLocationByIdQuery(42), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<Location>>(result);
        Assert.Equal(42, ok.Value!.Id);
    }
}
