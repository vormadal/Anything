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

        var result = await handler.Handle(new CreateFoodPlanCommand("Week 1", weekStart, 31, true));

        Assert.Equal("Week 1", result.Name);
        Assert.Equal(weekStart, result.WeekStart);
        Assert.Equal(31, result.ActiveDays);
        Assert.True(result.AutoRenew);
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
            .Handle(new UpdateFoodPlanCommand(1, "New", newWeekStart, 63, true));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal(newWeekStart, entity.WeekStart);
        Assert.Equal(63, entity.ActiveDays);
        Assert.True(entity.AutoRenew);
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
    private readonly IRepository<FoodPlan> _planRepo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public AddFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenPlanNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns((FoodPlan?)null);
        var handler = new AddFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new AddFoodPlanEntryCommand(1, "Pasta", null, 1));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WithExistingRecipeId_AddsEntryAndReturnsCreated()
    {
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        _recipeRepo.GetById(5).Returns(new Recipe { Id = 5, Name = "Pasta" });
        var handler = new AddFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new AddFoodPlanEntryCommand(1, "Pasta", 5, 2));

        Assert.IsType<Created<FoodPlanEntry>>(result);
        _entryRepo.Received(1).Add(Arg.Is<FoodPlanEntry>(e => e.RecipeId == 5 && e.FoodPlanId == 1 && e.DayOfWeek == 2));
    }

    [Fact]
    public async Task Handle_WithNoRecipeId_CreatesNewRecipeAndEntry()
    {
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        var handler = new AddFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new AddFoodPlanEntryCommand(1, "Custom Meal", null, 3));

        Assert.IsType<Created<FoodPlanEntry>>(result);
        _recipeRepo.Received(1).Add(Arg.Is<Recipe>(r => r.Name == "Custom Meal"));
    }
}

public class UpdateFoodPlanEntryHandlerTests
{
    private readonly IRepository<FoodPlan> _planRepo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenPlanNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns((FoodPlan?)null);
        var handler = new UpdateFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, 1, "Pasta", null, 2));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenEntryNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        _entryRepo.Query().Returns(new List<FoodPlanEntry>().AsAsyncQueryable());
        var handler = new UpdateFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, 99, "Pasta", null, 2));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenRecipeIdProvidedButNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        var entry = new FoodPlanEntry { Id = 1, FoodPlanId = 1, Name = "Old", DayOfWeek = 0 };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        _recipeRepo.GetById(99).Returns((Recipe?)null);
        var handler = new UpdateFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, 1, "Pasta", 99, 2));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesEntryAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        var entry = new FoodPlanEntry { Id = 1, FoodPlanId = 1, Name = "Old", DayOfWeek = 0 };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new UpdateFoodPlanEntryHandler(_planRepo, _recipeRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateFoodPlanEntryCommand(1, 1, "New Meal", null, 3));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Meal", entry.Name);
        Assert.Equal(3, entry.DayOfWeek);
        Assert.Equal(now.UtcDateTime, entry.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteFoodPlanEntryHandlerTests
{
    private readonly IRepository<FoodPlan> _planRepo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteFoodPlanEntryHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenPlanNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns((FoodPlan?)null);
        var handler = new DeleteFoodPlanEntryHandler(_planRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(1, 1));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenEntryNotFound_ReturnsNotFound()
    {
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        _entryRepo.Query().Returns(new List<FoodPlanEntry>().AsAsyncQueryable());
        var handler = new DeleteFoodPlanEntryHandler(_planRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(1, 99));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        _planRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Week", WeekStart = DateTime.UtcNow, ActiveDays = 31 });
        var entry = new FoodPlanEntry { Id = 1, FoodPlanId = 1, Name = "Pasta", DayOfWeek = 1 };
        _entryRepo.Query().Returns(new List<FoodPlanEntry> { entry }.AsAsyncQueryable());
        var handler = new DeleteFoodPlanEntryHandler(_planRepo, _entryRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteFoodPlanEntryCommand(1, 1));

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entry.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
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

public class GetFoodPlanEntriesHandlerTests
{
    private readonly IRepository<FoodPlanEntry> _repo = Substitute.For<IRepository<FoodPlanEntry>>();

    [Fact]
    public async Task Handle_ReturnsOnlyEntriesForSpecifiedPlan()
    {
        _repo.Query().Returns(new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, Name = "Pasta", DayOfWeek = 0 },
            new() { Id = 2, FoodPlanId = 2, Name = "Other Plan Entry", DayOfWeek = 0 },
            new() { Id = 3, FoodPlanId = 1, Name = "Deleted", DayOfWeek = 1, DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetFoodPlanEntriesHandler(_repo).Handle(new GetFoodPlanEntriesQuery(1));

        Assert.Single(result);
        Assert.Equal("Pasta", result[0].Name);
    }
}
