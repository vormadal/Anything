using Anything.Application.Features.FoodPlans.Commands;
using Anything.Application.Features.FoodPlans.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class SeasonalTagRuleHandlerTests
{
    private readonly IRepository<SeasonalTagRule> _ruleRepo = Substitute.For<IRepository<SeasonalTagRule>>();
    private readonly IRepository<FoodPlanSettings> _settingsRepo = Substitute.For<IRepository<FoodPlanSettings>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private const int DecemberMask = 1 << 11;

    public SeasonalTagRuleHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 7, 1, 12, 0, 0, TimeSpan.Zero));
        _ruleRepo.Query().Returns(new List<SeasonalTagRule>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Create_NormalizesKeywordAndReturnsCreated()
    {
        var handler = new CreateSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(
            new CreateSeasonalTagRuleCommand("  Jul ", false, DecemberMask, 15), TestContext.Current.CancellationToken);

        Assert.IsType<Created<SeasonalTagRuleResponse>>(result);
        _ruleRepo.Received(1).Add(Arg.Is<SeasonalTagRule>(r =>
            r.Keyword == "jul" && r.HouseholdId == 1 && r.Months == DecemberMask && r.Boost == 15));
    }

    [Fact]
    public async Task Create_WithBlankKeyword_ReturnsBadRequest()
    {
        var handler = new CreateSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(
            new CreateSeasonalTagRuleCommand("   ", false, DecemberMask, 15), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        _ruleRepo.DidNotReceive().Add(Arg.Any<SeasonalTagRule>());
    }

    [Fact]
    public async Task Update_WhenRuleInOtherHousehold_ReturnsNotFound()
    {
        _ruleRepo.Query().Returns(new List<SeasonalTagRule>
        {
            new() { Id = 5, HouseholdId = 2, Keyword = "jul", Months = DecemberMask, Boost = 15 }
        }.AsAsyncQueryable());
        var handler = new UpdateSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(
            new UpdateSeasonalTagRuleCommand(5, "jul", false, DecemberMask, 15), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Update_UpdatesFieldsAndModifiedOn()
    {
        var rule = new SeasonalTagRule { Id = 5, HouseholdId = 1, Keyword = "jul", Months = DecemberMask, Boost = 15 };
        _ruleRepo.Query().Returns(new List<SeasonalTagRule> { rule }.AsAsyncQueryable());
        var handler = new UpdateSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(
            new UpdateSeasonalTagRuleCommand(5, "Vinter", true, 0b100000000011, 10), TestContext.Current.CancellationToken);

        Assert.IsType<Ok<SeasonalTagRuleResponse>>(result);
        Assert.Equal("vinter", rule.Keyword);
        Assert.True(rule.MatchPrefix);
        Assert.Equal(0b100000000011, rule.Months);
        Assert.Equal(10, rule.Boost);
        Assert.NotNull(rule.ModifiedOn);
    }

    [Fact]
    public async Task Delete_SoftDeletesRule()
    {
        var rule = new SeasonalTagRule { Id = 5, HouseholdId = 1, Keyword = "jul", Months = DecemberMask, Boost = 15 };
        _ruleRepo.Query().Returns(new List<SeasonalTagRule> { rule }.AsAsyncQueryable());
        var handler = new DeleteSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteSeasonalTagRuleCommand(5), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(rule.DeletedOn);
    }

    [Fact]
    public async Task Delete_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _ruleRepo.Query().Returns(new List<SeasonalTagRule>
        {
            new() { Id = 5, HouseholdId = 1, Keyword = "jul", Months = DecemberMask, Boost = 15, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());
        var handler = new DeleteSeasonalTagRuleHandler(_ruleRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteSeasonalTagRuleCommand(5), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task GetRules_WhenNotSeeded_SeedsDefaults()
    {
        var settings = new FoodPlanSettings { Id = 1, HouseholdId = 1, SeasonalTagsSeededOn = null };
        _settingsRepo.Query().Returns(new List<FoodPlanSettings> { settings }.AsAsyncQueryable());
        var handler = new GetSeasonalTagRulesHandler(_ruleRepo, _settingsRepo, _householdContext, _unitOfWork, _timeProvider);

        await handler.Handle(new GetSeasonalTagRulesQuery(), TestContext.Current.CancellationToken);

        _ruleRepo.Received(1).AddRange(Arg.Is<IEnumerable<SeasonalTagRule>>(rules =>
            rules.Any(r => r.Keyword == "jul") && rules.Any(r => r.Keyword == "sommer")));
        Assert.NotNull(settings.SeasonalTagsSeededOn);
    }

    [Fact]
    public async Task GetRules_WhenSettingsMissing_CreatesSettingsAndSeeds()
    {
        _settingsRepo.Query().Returns(new List<FoodPlanSettings>().AsAsyncQueryable());
        var handler = new GetSeasonalTagRulesHandler(_ruleRepo, _settingsRepo, _householdContext, _unitOfWork, _timeProvider);

        await handler.Handle(new GetSeasonalTagRulesQuery(), TestContext.Current.CancellationToken);

        _settingsRepo.Received(1).Add(Arg.Is<FoodPlanSettings>(s => s.HouseholdId == 1 && s.SeasonalTagsSeededOn != null));
        _ruleRepo.Received(1).AddRange(Arg.Any<IEnumerable<SeasonalTagRule>>());
    }

    [Fact]
    public async Task GetRules_WhenSeeded_ReturnsHouseholdRulesOnly()
    {
        _settingsRepo.Query().Returns(new List<FoodPlanSettings>
        {
            new() { Id = 1, HouseholdId = 1, SeasonalTagsSeededOn = DateTime.UtcNow }
        }.AsAsyncQueryable());
        _ruleRepo.Query().Returns(new List<SeasonalTagRule>
        {
            new() { Id = 1, HouseholdId = 1, Keyword = "jul", Months = DecemberMask, Boost = 15 },
            new() { Id = 2, HouseholdId = 2, Keyword = "sommer", Months = 0b111000000, Boost = 10 },
            new() { Id = 3, HouseholdId = 1, Keyword = "vinter", Months = DecemberMask, Boost = 10, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());
        var handler = new GetSeasonalTagRulesHandler(_ruleRepo, _settingsRepo, _householdContext, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new GetSeasonalTagRulesQuery(), TestContext.Current.CancellationToken);

        var rule = Assert.Single(result);
        Assert.Equal("jul", rule.Keyword);
        _ruleRepo.DidNotReceive().AddRange(Arg.Any<IEnumerable<SeasonalTagRule>>());
    }
}
