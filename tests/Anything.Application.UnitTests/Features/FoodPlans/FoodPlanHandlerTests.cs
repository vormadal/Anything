using Anything.Application.Features.FoodPlans.Commands;
using Anything.Application.Features.FoodPlans.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class CreateFoodPlanHandlerTests
{
    private readonly IRepository<FoodPlan> _repo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public CreateFoodPlanHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesPlanWithFieldsAndReturnsEntity()
    {
        var weekStart = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var handler = new CreateFoodPlanHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateFoodPlanCommand("Week 1", weekStart, 31));

        Assert.Equal("Week 1", result.Name);
        Assert.Equal(weekStart, result.WeekStart);
        Assert.Equal(31, result.ActiveDays);
        _repo.Received(1).Add(Arg.Is<FoodPlan>(p => p.Name == "Week 1"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateFoodPlanHandlerTests
{
    private readonly IRepository<FoodPlan> _repo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateFoodPlanHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((FoodPlan?)null);
        var weekStart = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);

        var result = await new UpdateFoodPlanHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateFoodPlanCommand(1, "X", weekStart));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesFieldsAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new FoodPlan { Id = 1, Name = "Old", WeekStart = DateTime.UtcNow, ActiveDays = 31 };
        _repo.GetById(1).Returns(entity);
        var newWeekStart = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc);

        var result = await new UpdateFoodPlanHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateFoodPlanCommand(1, "New", newWeekStart, 63));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal(newWeekStart, entity.WeekStart);
        Assert.Equal(63, entity.ActiveDays);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteFoodPlanHandlerTests
{
    private readonly IRepository<FoodPlan> _repo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteFoodPlanHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((FoodPlan?)null);

        var result = await new DeleteFoodPlanHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteFoodPlanCommand(1));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new FoodPlan { Id = 1, Name = "Week 1", WeekStart = DateTime.UtcNow, ActiveDays = 31 };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteFoodPlanHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteFoodPlanCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class AddFoodPlanEntryHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public AddFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WithExistingRecipeId_AddsEntryAndReturnsCreated()
    {
        _recipeRepo.GetById(5).Returns(new Recipe { Id = 5, Name = "Pasta" });
        var handler = new AddFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc); // Wednesday

        var result = await handler.Handle(new AddFoodPlanEntryCommand("Pasta", 5, date));

        Assert.IsType<Created<FoodPlanEntry>>(result);
        _entryRepo.Received(1).Add(Arg.Is<FoodPlanEntry>(e =>
            e.RecipeId == 5 &&
            e.Date == date &&
            e.DayOfWeek == ((int)date.DayOfWeek + 6) % 7));
    }

    [Fact]
    public async Task Handle_WithDeletedRecipe_ReturnsNotFound()
    {
        _recipeRepo.GetById(5).Returns(new Recipe { Id = 5, Name = "Pasta", DeletedOn = DateTime.UtcNow });
        var handler = new AddFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc);

        var result = await handler.Handle(new AddFoodPlanEntryCommand("Pasta", 5, date));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WithNonExistentRecipeId_ReturnsNotFound()
    {
        _recipeRepo.GetById(99).Returns((Recipe?)null);
        var handler = new AddFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc);

        var result = await handler.Handle(new AddFoodPlanEntryCommand("Pasta", 99, date));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WithNoRecipeId_CreatesNewRecipeAndEntry()
    {
        var handler = new AddFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        var date = new DateTime(2026, 3, 12, 0, 0, 0, DateTimeKind.Utc); // Thursday

        var result = await handler.Handle(new AddFoodPlanEntryCommand("Custom Meal", null, date));

        Assert.IsType<Created<FoodPlanEntry>>(result);
        _recipeRepo.Received(1).Add(Arg.Is<Recipe>(r => r.Name == "Custom Meal"));
        _entryRepo.Received(1).Add(Arg.Is<FoodPlanEntry>(e =>
            e.Name == "Custom Meal" &&
            e.Date == date &&
            e.DayOfWeek == ((int)date.DayOfWeek + 6) % 7));
    }

    [Fact]
    public async Task Handle_SetsDayOfWeekFromDate()
    {
        var handler = new AddFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        // Monday 2026-03-09: DayOfWeek=1(Monday), mapped = (1+6)%7 = 0
        var monday = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);

        await handler.Handle(new AddFoodPlanEntryCommand("Monday Meal", null, monday));

        _entryRepo.Received(1).Add(Arg.Is<FoodPlanEntry>(e => e.DayOfWeek == 0));
    }
}

public class UpdateFoodPlanEntryHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenEntryNotFound_ReturnsNotFound()
    {
        _entryRepo.Query().Returns(new List<FoodPlanEntry>().AsAsyncQueryable());
        var handler = new UpdateFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(99, "Pasta", null, date));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenRecipeIdProvidedButNotFound_ReturnsNotFound()
    {
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc);
        var entry = new FoodPlanEntry { Id = 1, Name = "Old", DayOfWeek = 0, Date = date };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        _recipeRepo.GetById(99).Returns((Recipe?)null);
        var handler = new UpdateFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, "Pasta", 99, date));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesEntryAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var oldDate = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var newDate = new DateTime(2026, 3, 12, 0, 0, 0, DateTimeKind.Utc); // Thursday
        var entry = new FoodPlanEntry { Id = 1, Name = "Old", DayOfWeek = 0, Date = oldDate };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new UpdateFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, "New Meal", null, newDate));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Meal", entry.Name);
        Assert.Equal(newDate, entry.Date);
        Assert.Equal(((int)newDate.DayOfWeek + 6) % 7, entry.DayOfWeek);
        Assert.Equal(now.UtcDateTime, entry.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_IgnoresDeletedEntries()
    {
        var date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc);
        var entry = new FoodPlanEntry { Id = 1, Name = "Deleted", DayOfWeek = 0, Date = date, DeletedOn = DateTime.UtcNow };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new UpdateFoodPlanEntryHandler(_recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, "New", null, date));

        Assert.IsType<NotFound<string>>(result);
    }
}

public class DeleteFoodPlanEntryHandlerTests
{
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenEntryNotFound_ReturnsNotFound()
    {
        _entryRepo.Query().Returns(new List<FoodPlanEntry>().AsAsyncQueryable());
        var handler = new DeleteFoodPlanEntryHandler(_entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(99));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var entry = new FoodPlanEntry { Id = 1, Name = "Pasta", DayOfWeek = 0, Date = date };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new DeleteFoodPlanEntryHandler(_entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entry.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_IgnoresDeletedEntries()
    {
        var date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var entry = new FoodPlanEntry { Id = 1, Name = "Pasta", DayOfWeek = 0, Date = date, DeletedOn = DateTime.UtcNow };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new DeleteFoodPlanEntryHandler(_entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(1));

        Assert.IsType<NotFound<string>>(result);
    }
}

public class GetFoodPlansHandlerTests
{
    private readonly IRepository<FoodPlan> _repo = Substitute.For<IRepository<FoodPlan>>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedPlans()
    {
        _repo.Query().Returns(new List<FoodPlan>
        {
            new() { Id = 1, Name = "Active", WeekStart = DateTime.UtcNow, ActiveDays = 31 },
            new() { Id = 2, Name = "Deleted", WeekStart = DateTime.UtcNow, ActiveDays = 31, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetFoodPlansHandler(_repo).Handle(new GetFoodPlansQuery());

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }
}

public class GetFoodPlanByIdHandlerTests
{
    private readonly IRepository<FoodPlan> _repo = Substitute.For<IRepository<FoodPlan>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((FoodPlan?)null);
        var result = await new GetFoodPlanByIdHandler(_repo).Handle(new GetFoodPlanByIdQuery(1));
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOk()
    {
        var entity = new FoodPlan { Id = 1, Name = "Week 1", WeekStart = DateTime.UtcNow, ActiveDays = 31 };
        _repo.GetById(1).Returns(entity);

        var result = await new GetFoodPlanByIdHandler(_repo).Handle(new GetFoodPlanByIdQuery(1));

        var ok = Assert.IsType<Ok<FoodPlan>>(result);
        Assert.Equal("Week 1", ok.Value!.Name);
    }
}

public class GetFoodPlanEntriesByDateRangeHandlerTests
{
    private readonly IRepository<FoodPlanEntry> _repo = Substitute.For<IRepository<FoodPlanEntry>>();

    [Fact]
    public async Task Handle_ReturnsEntriesWithinDateRange()
    {
        var startDate = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var endDate = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc);

        _repo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, Name = "Wednesday", DayOfWeek = 2, Date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 3, Name = "Outside Range", DayOfWeek = 0, Date = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 4, Name = "Deleted", DayOfWeek = 1, Date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc), DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetFoodPlanEntriesByDateRangeHandler(_repo)
            .Handle(new GetFoodPlanEntriesByDateRangeQuery(startDate, endDate));

        Assert.Equal(2, result.Count);
        Assert.Equal("Monday", result[0].Name);
        Assert.Equal("Wednesday", result[1].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyWhenNoEntriesInRange()
    {
        var startDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = new DateTime(2026, 4, 7, 0, 0, 0, DateTimeKind.Utc);

        _repo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, Name = "March Entry", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        }.AsAsyncQueryable());

        var result = await new GetFoodPlanEntriesByDateRangeHandler(_repo)
            .Handle(new GetFoodPlanEntriesByDateRangeQuery(startDate, endDate));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_OrdersResultsByDate()
    {
        var startDate = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
        var endDate = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc);

        _repo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, Name = "Friday", DayOfWeek = 4, Date = new DateTime(2026, 3, 13, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 3, Name = "Wednesday", DayOfWeek = 2, Date = new DateTime(2026, 3, 11, 0, 0, 0, DateTimeKind.Utc) }
        }.AsAsyncQueryable());

        var result = await new GetFoodPlanEntriesByDateRangeHandler(_repo)
            .Handle(new GetFoodPlanEntriesByDateRangeQuery(startDate, endDate));

        Assert.Equal("Monday", result[0].Name);
        Assert.Equal("Wednesday", result[1].Name);
        Assert.Equal("Friday", result[2].Name);
    }
}

public class GetFoodPlanSettingsHandlerTests
{
    private readonly IRepository<FoodPlanSettings> _repo = Substitute.For<IRepository<FoodPlanSettings>>();

    [Fact]
    public async Task Handle_WhenSettingsExist_ReturnsSettings()
    {
        var settings = new FoodPlanSettings { Id = 1, ActiveDays = 63 };
        _repo.Query().Returns(new List<FoodPlanSettings> { settings }.AsAsyncQueryable());

        var result = await new GetFoodPlanSettingsHandler(_repo).Handle(new GetFoodPlanSettingsQuery());

        Assert.Equal(63, result.ActiveDays);
        Assert.Equal(1, result.Id);
    }

    [Fact]
    public async Task Handle_WhenNoSettingsExist_ReturnsDefault()
    {
        _repo.Query().Returns(new List<FoodPlanSettings>().AsAsyncQueryable());

        var result = await new GetFoodPlanSettingsHandler(_repo).Handle(new GetFoodPlanSettingsQuery());

        Assert.Equal(31, result.ActiveDays);
        Assert.Equal(0, result.Id);
    }
}

public class UpdateFoodPlanSettingsHandlerTests
{
    private readonly IRepository<FoodPlanSettings> _repo = Substitute.For<IRepository<FoodPlanSettings>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateFoodPlanSettingsHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNoSettingsExist_CreatesNew()
    {
        _repo.Query().Returns(new List<FoodPlanSettings>().AsAsyncQueryable());
        var handler = new UpdateFoodPlanSettingsHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanSettingsCommand(63));

        Assert.IsType<Ok<FoodPlanSettings>>(result);
        _repo.Received(1).Add(Arg.Is<FoodPlanSettings>(s => s.ActiveDays == 63));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenSettingsExist_Updates()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var existing = new FoodPlanSettings { Id = 1, ActiveDays = 31 };
        _repo.Query().Returns(new List<FoodPlanSettings> { existing }.AsAsyncQueryable());
        var handler = new UpdateFoodPlanSettingsHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanSettingsCommand(127));

        Assert.IsType<Ok<FoodPlanSettings>>(result);
        Assert.Equal(127, existing.ActiveDays);
        Assert.Equal(now.UtcDateTime, existing.ModifiedOn);
        _repo.Received(1).Update(existing);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
