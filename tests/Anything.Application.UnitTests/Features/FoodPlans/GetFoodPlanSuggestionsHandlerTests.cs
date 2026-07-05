using Anything.Application.Features.FoodPlans.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class GetFoodPlanSuggestionsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IRepository<SeasonalTagRule> _ruleRepo = Substitute.For<IRepository<SeasonalTagRule>>();
    private readonly IRepository<FoodPlanSettings> _settingsRepo = Substitute.For<IRepository<FoodPlanSettings>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private static readonly DateOnly Target = new(2026, 7, 15);

    public GetFoodPlanSuggestionsHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 7, 1, 12, 0, 0, TimeSpan.Zero));
        SetupSettings(new FoodPlanSettings { Id = 1, HouseholdId = 1, SeasonalTagsSeededOn = DateTime.UtcNow });
        _ruleRepo.Query().Returns(new List<SeasonalTagRule>().AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>().AsAsyncQueryable());
        _entryRepo.Query().Returns(new List<FoodPlanEntry>().AsAsyncQueryable());
        _recipeRepo.Query().Returns(new List<Recipe>().AsAsyncQueryable());
    }

    private void SetupSettings(FoodPlanSettings? settings)
    {
        List<FoodPlanSettings> list = settings is null ? [] : [settings];
        _settingsRepo.Query().Returns(list.AsAsyncQueryable());
    }

    private GetFoodPlanSuggestionsHandler CreateHandler() => new(
        _recipeRepo, _entryRepo, _tagRepo, _ruleRepo, _settingsRepo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_ExcludesOtherHouseholdsAndDeletedRecipes()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "Mine" },
            new() { Id = 2, HouseholdId = 2, Name = "Theirs" },
            new() { Id = 3, HouseholdId = 1, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Mine", result[0].Name);
    }

    [Fact]
    public async Task Handle_IgnoresEntriesWithoutRecipeIdAndDeletedEntries()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "Mine" } }.AsAsyncQueryable());
        _entryRepo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, HouseholdId = 1, RecipeId = null, Name = "Ad hoc", Date = ToUtc(Target.AddDays(-1)) },
            new() { Id = 2, HouseholdId = 1, RecipeId = 1, Name = "Mine", Date = ToUtc(Target.AddDays(-2)), DeletedOn = DateTime.UtcNow },
            new() { Id = 3, HouseholdId = 2, RecipeId = 1, Name = "Mine", Date = ToUtc(Target.AddDays(-3)) }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        // None of the entries count: the recipe is treated as never planned (not excluded by the variety window).
        Assert.Single(result);
        Assert.Null(result[0].LastPlannedOn);
        Assert.Equal(0, result[0].TimesPlanned);
    }

    [Fact]
    public async Task Handle_ClampsCount()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "A" },
            new() { Id = 2, HouseholdId = 1, Name = "B" },
            new() { Id = 3, HouseholdId = 1, Name = "C" }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target, 0), TestContext.Current.CancellationToken);

        Assert.Single(result);
    }

    [Fact]
    public async Task Handle_MapsPlanHistoryToResponse()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "Pasta" } }.AsAsyncQueryable());
        _entryRepo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, HouseholdId = 1, RecipeId = 1, Name = "Pasta", Date = ToUtc(Target.AddDays(-30)) },
            new() { Id = 2, HouseholdId = 1, RecipeId = 1, Name = "Pasta", Date = ToUtc(Target.AddDays(-60)) }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        var suggestion = Assert.Single(result);
        Assert.Equal(Target.AddDays(-30), suggestion.LastPlannedOn);
        Assert.Equal(2, suggestion.TimesPlanned);
        Assert.NotEmpty(suggestion.Reasons);
        Assert.True(suggestion.Score > 0);
    }

    [Fact]
    public async Task Handle_WhenNotSeeded_SeedsDefaultRulesOnce()
    {
        var settings = new FoodPlanSettings { Id = 1, HouseholdId = 1, SeasonalTagsSeededOn = null };
        SetupSettings(settings);

        await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        _ruleRepo.Received(1).AddRange(Arg.Is<IEnumerable<SeasonalTagRule>>(rules => rules.Any(r => r.Keyword == "jul")));
        Assert.NotNull(settings.SeasonalTagsSeededOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenAlreadySeeded_DoesNotSeedAgain()
    {
        await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        _ruleRepo.DidNotReceive().AddRange(Arg.Any<IEnumerable<SeasonalTagRule>>());
        await _unitOfWork.DidNotReceive().SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UsesHouseholdTuningFromSettings()
    {
        // An exclusion window of 13 days excludes a recipe planned 10 days ago.
        SetupSettings(new FoodPlanSettings
        {
            Id = 1,
            HouseholdId = 1,
            SeasonalTagsSeededOn = DateTime.UtcNow,
            SuggestionExclusionWindowDays = 13
        });
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "Pasta" } }.AsAsyncQueryable());
        _entryRepo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, HouseholdId = 1, RecipeId = 1, Name = "Pasta", Date = ToUtc(Target.AddDays(-10)) }
        }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetFoodPlanSuggestionsQuery(Target), TestContext.Current.CancellationToken);

        Assert.Empty(result);
    }

    private static DateTime ToUtc(DateOnly date) => date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
}
