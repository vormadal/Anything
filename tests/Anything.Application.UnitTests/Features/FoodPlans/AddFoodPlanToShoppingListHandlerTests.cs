using Anything.Application.Features.FoodPlans.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class AddFoodPlanToShoppingListHandlerTests
{
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IRepository<ShoppingList> _shoppingListRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IRepository<ShoppingListRecommendation> _recommendationRepo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private readonly DateTime _startDate = new(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc);
    private readonly DateTime _endDate = new(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc);

    private AddFoodPlanToShoppingListHandler CreateHandler() =>
        new(_entryRepo, _ingredientRepo, _shoppingListRepo, _itemRepo, _recommendationRepo, _unitOfWork, _timeProvider);

    public AddFoodPlanToShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 0, 0, 0, TimeSpan.Zero));
    }

    private void SetupValidList(int listId = 10)
    {
        _shoppingListRepo.GetById(listId).Returns(new ShoppingList { Id = listId, Name = "My List" });
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenShoppingListNotFound_ReturnsNotFound()
    {
        _shoppingListRepo.GetById(10).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenShoppingListDeleted_ReturnsNotFound()
    {
        _shoppingListRepo.GetById(10).Returns(new ShoppingList { Id = 10, Name = "Deleted", DeletedOn = DateTime.UtcNow });

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_CollectsIngredientsFromAllRecipeEntries()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, RecipeId = 200, Name = "Tuesday", DayOfWeek = 1, Date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Pasta", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Rice", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.Name == "Pasta" && i.Amount == 200));
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.Name == "Rice" && i.Amount == 300));
    }

    [Fact]
    public async Task Handle_AppliesPerRecipeMultipliers()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Flour", Amount = 200, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var multipliers = new List<Contracts.FoodPlans.RecipeMultiplier>
        {
            new(100, 3.0)
        };

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate, multipliers), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 600 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_DefaultMultiplierIsOneWhenNotSpecified()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Salt", Amount = 10, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Salt" && i.Amount == 10));
    }

    [Fact]
    public async Task Handle_MergesIngredientsFromMultipleRecipesWithSameNameAndUnit()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, RecipeId = 200, Name = "Tuesday", DayOfWeek = 1, Date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Flour", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Flour", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 500 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_IgnoresEntriesWithoutRecipeId()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = null, Name = "Homemade Salad", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());
        _ingredientRepo.Query().Returns(new List<RecipeIngredient>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        _itemRepo.DidNotReceive().Add(Arg.Any<ShoppingListItem>());
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Handle_ZeroMultiplier_SkipsRecipeIngredients()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Sugar", Amount = 50, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var multipliers = new List<Contracts.FoodPlans.RecipeMultiplier>
        {
            new(100, 0)
        };

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate, multipliers), TestContext.Current.CancellationToken);

        _itemRepo.DidNotReceive().Add(Arg.Any<ShoppingListItem>());
    }

    [Fact]
    public async Task Handle_NegativeMultiplier_DefaultsToOne()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Sugar", Amount = 50, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var multipliers = new List<Contracts.FoodPlans.RecipeMultiplier>
        {
            new(100, -1)
        };

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate, multipliers), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Sugar" && i.Amount == 50));
    }

    [Fact]
    public async Task Handle_MarksEntriesWithAddedToShoppingListOn()
    {
        var now = new DateTimeOffset(2026, 3, 10, 0, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0, Date = new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, RecipeId = 200, Name = "Tuesday", DayOfWeek = 1, Date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Pasta", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Rice", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        Assert.Equal(now.UtcDateTime, entries[0].AddedToShoppingListOn);
        Assert.Equal(now.UtcDateTime, entries[1].AddedToShoppingListOn);
        _entryRepo.Received(1).Update(entries[0]);
        _entryRepo.Received(1).Update(entries[1]);
    }

    [Fact]
    public async Task Handle_OnlyIncludesEntriesWithinDateRange()
    {
        SetupValidList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, RecipeId = 100, Name = "In Range", DayOfWeek = 0, Date = new DateTime(2026, 3, 10, 0, 0, 0, DateTimeKind.Utc) },
            new() { Id = 2, RecipeId = 200, Name = "Out Of Range", DayOfWeek = 0, Date = new DateTime(2026, 3, 20, 0, 0, 0, DateTimeKind.Utc) }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Pasta", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Rice", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(10, _startDate, _endDate), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.Name == "Pasta"));
        _itemRepo.DidNotReceive().Add(Arg.Is<ShoppingListItem>(i => i.Name == "Rice"));
    }
}
