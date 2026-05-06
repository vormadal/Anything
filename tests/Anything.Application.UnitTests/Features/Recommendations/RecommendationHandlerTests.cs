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
        _repo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", null, null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndPreferredUnit()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Old" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateRecommendationCommand(1, "New", "kg", null), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("kg", entity.PreferredUnit);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteRecommendationHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteRecommendationHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork);

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_RemovesAndReturnsNoContent()
    {
        var entity = new ShoppingListRecommendation { Id = 1, Name = "Sugar" };
        _repo.Query().Returns(new List<ShoppingListRecommendation> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteRecommendationCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Remove(entity);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetAllRecommendationsHandlerTests
{
    private readonly IRepository<ShoppingListRecommendation> _repo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsAllItems()
    {
        _repo.Query().Returns(new List<ShoppingListRecommendation>
        {
            new() { Id = 1, Name = "Bread" },
            new() { Id = 2, Name = "Salt" }
        }.AsAsyncQueryable());

        var result = await new GetAllRecommendationsHandler(_repo, _householdContext).Handle(new GetAllRecommendationsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
    }
}
