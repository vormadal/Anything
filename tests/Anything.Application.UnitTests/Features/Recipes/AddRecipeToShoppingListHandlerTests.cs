using Anything.Application.Features.Recipes.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recipes;

public class AddRecipeToShoppingListHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IRepository<ShoppingList> _shoppingListRepo = Substitute.For<IRepository<ShoppingList>>();
    private readonly IRepository<ShoppingListItem> _itemRepo = Substitute.For<IRepository<ShoppingListItem>>();
    private readonly IRepository<ShoppingListRecommendation> _recommendationRepo = Substitute.For<IRepository<ShoppingListRecommendation>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private AddRecipeToShoppingListHandler CreateHandler() =>
        new(_recipeRepo, _ingredientRepo, _shoppingListRepo, _itemRepo, _recommendationRepo, _householdContext, _unitOfWork, _timeProvider);

    public AddRecipeToShoppingListHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }

    private void SetupValidRecipeAndList(int recipeId = 1, int listId = 10)
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new Recipe { Id = recipeId, Name = "Test" } }.AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList> { new ShoppingList { Id = listId, Name = "My List" } }.AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.Query().Returns(new List<Recipe>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenRecipeDeleted_ReturnsNotFound()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new Recipe { Id = 1, Name = "Test", DeletedOn = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) } }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenShoppingListNotFound_ReturnsNotFound()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new Recipe { Id = 1, Name = "Test" } }.AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_GroupsSameNameSameUnitIngredients()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Flour", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 1, Name = "Flour", Amount = 100, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        // Should add a single item with 300g of flour
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 300 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_SeparatesSameNameDifferentUnitIngredients()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Flour", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 1, Name = "Flour", Amount = 2, Unit = "cups" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        _itemRepo.Received(2).Add(Arg.Any<ShoppingListItem>());
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 200 && i.Unit == "g"));
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Flour" && i.Amount == 2 && i.Unit == "cups"));
    }

    [Fact]
    public async Task Handle_AppliesMultiplierCorrectly()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Spaghetti", Amount = 200, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10, 2.5), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Spaghetti" && i.Amount == 500 && i.Unit == "g"));
    }

    [Fact]
    public async Task Handle_ZeroMultiplier_SkipsIngredients()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Salt", Amount = 10, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new AddRecipeToShoppingListCommand(1, 10, 0), TestContext.Current.CancellationToken);

        _itemRepo.DidNotReceive().Add(Arg.Any<ShoppingListItem>());
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Handle_NegativeMultiplier_DefaultsToOne()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Salt", Amount = 10, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10, -1), TestContext.Current.CancellationToken);

        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Amount == 10));
    }

    [Fact]
    public async Task Handle_MergesWithExistingItems()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new Recipe { Id = 1, Name = "Test" } }.AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList> { new ShoppingList { Id = 10, Name = "My List" } }.AsAsyncQueryable());

        var existingItem = new ShoppingListItem
        {
            Id = 100, ShoppingListId = 10, Name = "Flour", Amount = 200, Unit = "g", AddedByRecipe = "Test"
        };
        _itemRepo.Query().Returns(new List<ShoppingListItem> { existingItem }.AsAsyncQueryable());
        _recommendationRepo.Query().Returns(new List<ShoppingListRecommendation>().AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Flour", Amount = 300, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        // Should update existing item, not add new one
        Assert.Equal(500, existingItem.Amount);
        _itemRepo.Received(1).Update(existingItem);
        _itemRepo.DidNotReceive().Add(Arg.Is<ShoppingListItem>(i => i.Name == "Flour"));
    }

    [Fact]
    public async Task Handle_CreatesRecommendationsForNewIngredients()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Basil", Amount = 5, Unit = "leaves" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        _recommendationRepo.Received(1).Add(Arg.Is<ShoppingListRecommendation>(r =>
            r.Name == "Basil"));
    }

    [Fact]
    public async Task Handle_DoesNotDuplicateExistingRecommendations()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new Recipe { Id = 1, Name = "Test" } }.AsAsyncQueryable());
        _shoppingListRepo.Query().Returns(new List<ShoppingList> { new ShoppingList { Id = 10, Name = "My List" } }.AsAsyncQueryable());
        _itemRepo.Query().Returns(new List<ShoppingListItem>().AsAsyncQueryable());

        _recommendationRepo.Query().Returns(
            new List<ShoppingListRecommendation>
            {
                new() { Id = 1, Name = "basil" }
            }.AsAsyncQueryable());

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Basil", Amount = 5, Unit = "leaves" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        _recommendationRepo.DidNotReceive().Add(Arg.Any<ShoppingListRecommendation>());
    }

    [Fact]
    public async Task Handle_HandlesNullUnitsCorrectly()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Eggs", Amount = 3, Unit = null },
            new() { Id = 2, RecipeId = 1, Name = "Eggs", Amount = 2, Unit = "" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        // null and "" should be treated as same unit, grouped together
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Name == "Eggs" && i.Amount == 5));
    }

    [Fact]
    public async Task Handle_TrimsIngredientNames()
    {
        SetupValidRecipeAndList();

        var ingredients = new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "  Flour  ", Amount = 200, Unit = "g" },
            new() { Id = 2, RecipeId = 1, Name = "Flour", Amount = 100, Unit = "g" }
        };
        _ingredientRepo.Query().Returns(ingredients.AsAsyncQueryable());

        var handler = CreateHandler();
        await handler.Handle(new AddRecipeToShoppingListCommand(1, 10), TestContext.Current.CancellationToken);

        // Should group despite whitespace differences
        _itemRepo.Received(1).Add(Arg.Is<ShoppingListItem>(i =>
            i.Amount == 300));
    }
}
