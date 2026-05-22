using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recipes;

public class ExportRecipeTagsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public ExportRecipeTagsHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
    }

    [Fact]
    public async Task Handle_ReturnsRecipesWithIngredientsAndTags()
    {
        _recipeRepo.Query().Returns(new[]
        {
            new Recipe { Id = 1, HouseholdId = 1, Name = "Soup" }
        }.AsAsyncQueryable());
        _ingredientRepo.Query().Returns(new[]
        {
            new RecipeIngredient { Id = 1, RecipeId = 1, Name = "Water", SortOrder = 0 },
            new RecipeIngredient { Id = 2, RecipeId = 1, Name = "Salt", SortOrder = 1 }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new[]
        {
            new RecipeTag { Id = 1, RecipeId = 1, Name = "Warm" },
            new RecipeTag { Id = 2, RecipeId = 1, Name = "warm" }
        }.AsAsyncQueryable());

        var result = await new ExportRecipeTagsHandler(_recipeRepo, _ingredientRepo, _tagRepo, _householdContext)
            .Handle(new ExportRecipeTagsQuery(), TestContext.Current.CancellationToken);

        var recipe = Assert.Single(result.Recipes);
        Assert.Equal("Soup", recipe.RecipeName);
        Assert.Equal(["Water", "Salt"], recipe.Ingredients);
        Assert.Single(recipe.Tags);
        Assert.Equal("Warm", recipe.Tags[0], StringComparer.OrdinalIgnoreCase);
    }
}

public class ImportRecipeTagsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public ImportRecipeTagsHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 5, 1, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_ReplacesTagsForMatchingRecipe()
    {
        var existingRecipe = new Recipe { Id = 1, HouseholdId = 1, Name = "Soup" };
        var oldTag = new RecipeTag { Id = 1, RecipeId = 1, Name = "Old" };
        var keepTag = new RecipeTag { Id = 2, RecipeId = 1, Name = "Keep" };

        _recipeRepo.Query().Returns(new[] { existingRecipe }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new[] { oldTag, keepTag }.AsAsyncQueryable());

        var result = await new ImportRecipeTagsHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new ImportRecipeTagsCommand([
                new RecipeTagImportExportItem("Soup", ["Keep", "New"])
            ]), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(oldTag.DeletedOn);
        Assert.Null(keepTag.DeletedOn);
        _tagRepo.Received(1).Add(Arg.Is<RecipeTag>(t => t.RecipeId == 1 && t.Name == "New"));
    }

    [Fact]
    public async Task Handle_WhenRecipeMissing_ReturnsBadRequest()
    {
        _recipeRepo.Query().Returns(Array.Empty<Recipe>().AsAsyncQueryable());
        _tagRepo.Query().Returns(Array.Empty<RecipeTag>().AsAsyncQueryable());

        var result = await new ImportRecipeTagsHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new ImportRecipeTagsCommand([
                new RecipeTagImportExportItem("Missing", ["Any"])
            ]), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }
}
