using Anything.Application.Features.HomePreferences.Commands;
using Anything.Application.Features.HomePreferences.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.HomePreferences;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.HomePreferences;

public class GetHomeCardPreferencesHandlerTests
{
    private readonly IRepository<HomeCardPreference> _repo = Substitute.For<IRepository<HomeCardPreference>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetHomeCardPreferencesHandler CreateHandler() => new(_repo, _householdContext);

    public GetHomeCardPreferencesHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
    }

    [Fact]
    public async Task Handle_WhenNoExistingPreferences_ReturnsAllKnownCardsVisibleInDefaultOrder()
    {
        _repo.Query().Returns(new List<HomeCardPreference>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetHomeCardPreferencesQuery(5), TestContext.Current.CancellationToken);

        Assert.Equal(HomeCardKeys.All, result.Select(r => r.CardKey).ToList());
        Assert.All(result, r => Assert.True(r.IsVisible));
        Assert.Equal([0, 1, 2], result.Select(r => r.SortOrder).ToList());
    }

    [Fact]
    public async Task Handle_WhenPreferencesExist_ReturnsThemOrderedAndAppendsMissingDefaults()
    {
        var existing = new List<HomeCardPreference>
        {
            new() { Id = 1, HouseholdId = 1, UserId = 5, CardKey = HomeCardKeys.Bills, SortOrder = 0, IsVisible = false },
        };
        _repo.Query().Returns(existing.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetHomeCardPreferencesQuery(5), TestContext.Current.CancellationToken);

        Assert.Equal(HomeCardKeys.Bills, result[0].CardKey);
        Assert.False(result[0].IsVisible);
        Assert.Equal(0, result[0].SortOrder);

        var remainingKeys = result.Skip(1).Select(r => r.CardKey).ToList();
        Assert.Equal(HomeCardKeys.All.Where(k => k != HomeCardKeys.Bills).ToList(), remainingKeys);
        Assert.All(result.Skip(1), r => Assert.True(r.IsVisible));
    }

    [Fact]
    public async Task Handle_OnlyConsidersPreferencesForRequestedHouseholdAndUser()
    {
        var existing = new List<HomeCardPreference>
        {
            new() { Id = 1, HouseholdId = 2, UserId = 5, CardKey = HomeCardKeys.Bills, SortOrder = 0, IsVisible = false },
            new() { Id = 2, HouseholdId = 1, UserId = 9, CardKey = HomeCardKeys.Lists, SortOrder = 0, IsVisible = false },
        };
        _repo.Query().Returns(existing.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new GetHomeCardPreferencesQuery(5), TestContext.Current.CancellationToken);

        Assert.Equal(HomeCardKeys.All, result.Select(r => r.CardKey).ToList());
        Assert.All(result, r => Assert.True(r.IsVisible));
    }
}

public class UpdateHomeCardPreferencesHandlerTests
{
    private readonly IRepository<HomeCardPreference> _repo = Substitute.For<IRepository<HomeCardPreference>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UpdateHomeCardPreferencesHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public UpdateHomeCardPreferencesHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNoExistingPreferences_AddsOneRowPerCardInGivenOrder()
    {
        _repo.Query().Returns(new List<HomeCardPreference>().AsAsyncQueryable());
        var command = new UpdateHomeCardPreferencesCommand(5,
        [
            new HomeCardPreferenceItem(HomeCardKeys.Bills, true),
            new HomeCardPreferenceItem(HomeCardKeys.FoodPlan, false),
        ]);

        var handler = CreateHandler();
        await handler.Handle(command, TestContext.Current.CancellationToken);

        _repo.Received(1).Add(Arg.Is<HomeCardPreference>(p =>
            p.HouseholdId == 1 && p.UserId == 5 && p.CardKey == HomeCardKeys.Bills && p.SortOrder == 0 && p.IsVisible));
        _repo.Received(1).Add(Arg.Is<HomeCardPreference>(p =>
            p.HouseholdId == 1 && p.UserId == 5 && p.CardKey == HomeCardKeys.FoodPlan && p.SortOrder == 1 && !p.IsVisible));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenPreferenceExists_UpdatesSortOrderAndVisibility()
    {
        var existing = new HomeCardPreference
        {
            Id = 1,
            HouseholdId = 1,
            UserId = 5,
            CardKey = HomeCardKeys.FoodPlan,
            SortOrder = 5,
            IsVisible = true,
        };
        _repo.Query().Returns(new List<HomeCardPreference> { existing }.AsAsyncQueryable());
        var command = new UpdateHomeCardPreferencesCommand(5, [new HomeCardPreferenceItem(HomeCardKeys.FoodPlan, false)]);

        var handler = CreateHandler();
        await handler.Handle(command, TestContext.Current.CancellationToken);

        Assert.Equal(0, existing.SortOrder);
        Assert.False(existing.IsVisible);
        Assert.NotNull(existing.ModifiedOn);
        _repo.Received(1).Update(existing);
    }

    [Fact]
    public async Task Handle_ReturnsNoContent()
    {
        _repo.Query().Returns(new List<HomeCardPreference>().AsAsyncQueryable());
        var command = new UpdateHomeCardPreferencesCommand(5, [new HomeCardPreferenceItem(HomeCardKeys.FoodPlan)]);

        var handler = CreateHandler();
        var result = await handler.Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
    }
}
