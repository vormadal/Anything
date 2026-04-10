using Anything.Application.Features.Recommendations.Commands;
using Anything.Application.Features.Recommendations.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recommendations;

public class UpdateRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private UpdateRecommendationHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public UpdateRecommendationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingListRecommendation?)null);

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new ShoppingListRecommendation
        {
            Id = 1, Name = "X", DeletedOn = DateTime.UtcNow
        });

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndPreferredUnit()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Old" };
        _repo.GetById(1).Returns(entity);

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", "kg", null), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("kg", entity.PreferredUnit);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class ApproveRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private ApproveRecommendationHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public ApproveRecommendationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingListRecommendation?)null);

        var result = await CreateHandler().Handle(new ApproveRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsIsApprovedTrueAndReturnsNoContent()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Sugar", IsApproved = false };
        _repo.GetById(1).Returns(entity);

        var result = await CreateHandler().Handle(new ApproveRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.True(entity.IsApproved);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteRecommendationHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public DeleteRecommendationHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((ShoppingListRecommendation?)null);

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Sugar" };
        _repo.GetById(1).Returns(entity);

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetAllRecommendationsHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Bread" },
            new() { Id = 2, Name = "Salt", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext).Handle(new GetAllRecommendationsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Bread", result[0].Name);
    }
}

public class GetPendingRecommendationsHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyPendingItems()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Milk", IsApproved = false },
            new() { Id = 2, Name = "Eggs", IsApproved = true },
            new() { Id = 3, Name = "Butter", IsApproved = false, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetPendingRecommendationsHandler(_repo, _householdContext).Handle(new GetPendingRecommendationsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Milk", result[0].Name);
    }
}

public class GetApprovedRecommendationsHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsOnlyApprovedItems()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Flour", IsApproved = true },
            new() { Id = 2, Name = "Sugar", IsApproved = false },
            new() { Id = 3, Name = "Oil", IsApproved = true, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetApprovedRecommendationsHandler(_repo, _householdContext).Handle(new GetApprovedRecommendationsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Flour", result[0].Name);
    }
}
