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
    private readonly IRepository<FoodPlan> _foodPlanRepo = Substitute.For<IRepository<FoodPlan>>();
    private readonly IRepository<FoodPlanEntry> _entryRepo = Substitute.For<IRepository<FoodPlanEntry>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IRepository<ShoppingList> _shoppingListRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IRepository<ShoppingListRecommendation> _recommendationRepo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private AddFoodPlanToShoppingListHandler CreateHandler() =>
        new(_foodPlanRepo, _entryRepo, _ingredientRepo, _shoppingListRepo, _itemRepo, _recommendationRepo, _unitOfWork);

    private void SetupValidPlanAndList(int planId = 1, int listId = 10)
    {
        _foodPlanRepo.GetById(planId).Returns(new FoodPlan { Id = planId, Name = "Week Plan", WeekStart = DateTime.UtcNow });
        _shoppingListRepo.GetById(listId).Returns(new ShoppingList { Id = listId, Name = "My List" });
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenFoodPlanNotFound_ReturnsNotFound()
    {
        _foodPlanRepo.GetById(1).Returns((FoodPlan?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenShoppingListNotFound_ReturnsNotFound()
    {
        _foodPlanRepo.GetById(1).Returns(new FoodPlan { Id = 1, Name = "Plan", WeekStart = DateTime.UtcNow });
        _shoppingListRepo.GetById(10).Returns((ShoppingList?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_CollectsIngredientsFromAllRecipeEntries()
    {
        SetupValidPlanAndList();

        // Two entries pointing to two different recipes
        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0 },
            new() { Id = 2, FoodPlanId = 1, RecipeId = 200, Name = "Tuesday", DayOfWeek = 1 }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Pasta", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Rice", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.Name == "Pasta" && i.Amount == 200));
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i => i.Name == "Rice" && i.Amount == 300));
    }

    [Fact]
    public async Task Handle_AppliesPerRecipeMultipliers()
    {
        SetupValidPlanAndList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0 }
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
        await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10, multipliers));

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 600 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_DefaultMultiplierIsOneWhenNotSpecified()
    {
        SetupValidPlanAndList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0 }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Salt", Amount = 10, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        // No multipliers passed
        await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Salt" && i.Amount == 10));
    }

    [Fact]
    public async Task Handle_MergesIngredientsFromMultipleRecipesWithSameNameAndUnit()
    {
        SetupValidPlanAndList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0 },
            new() { Id = 2, FoodPlanId = 1, RecipeId = 200, Name = "Tuesday", DayOfWeek = 1 }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Flour", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 200, Name = "Flour", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 500 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_IgnoresEntriesWithoutRecipeId()
    {
        SetupValidPlanAndList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = null, Name = "Homemade Salad", DayOfWeek = 0 }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());
        _ingredientRepo.Query().Returns(new List<RecipeIngredient>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10));

        _itemRepo.DidNotReceive().Add(Arg.Any<ShoppingListItem>());
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Handle_ZeroMultiplier_DefaultsToOne()
    {
        SetupValidPlanAndList();

        var entries = new List<FoodPlanEntry>
        {
            new() { Id = 1, FoodPlanId = 1, RecipeId = 100, Name = "Monday", DayOfWeek = 0 }
        };
        _entryRepo.Query().Returns(entries.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 100, Name = "Sugar", Amount = 50, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var multipliers = new List<Contracts.FoodPlans.RecipeMultiplier>
        {
            new(100, 0) // zero should default to 1
        };

        var handler = CreateHandler();
        await handler.Handle(new AddFoodPlanToShoppingListCommand(1, 10, multipliers));

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Sugar" && i.Amount == 50));
    }
}
