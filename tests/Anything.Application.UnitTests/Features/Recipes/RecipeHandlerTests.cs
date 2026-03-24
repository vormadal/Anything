using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;
using NSubstitute;
using System.Net.Http;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recipes;

public class CreateRecipeHandlerTests
{
    private readonly IRepository<Recipe> _repo = Substitute.For<IRepository<Recipe>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public CreateRecipeHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesRecipeWithFieldsAndReturnsEntity()
    {
        var handler = new CreateRecipeHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateRecipeCommand("Pasta", "https://example.com", "Great recipe", null, null, ServingsType.People), TestContext.Current.CancellationToken);

        Assert.Equal("Pasta", result.Name);
        Assert.Equal("https://example.com", result.Link);
        Assert.Equal("Great recipe", result.Notes);
        Assert.NotEqual(default, result.CreatedOn);
        _repo.Received(1).Add(Arg.Is<Recipe>(r => r.Name == "Pasta"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_CreatesRecipeWithTimeAndServings()
    {
        var handler = new CreateRecipeHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateRecipeCommand("Pancakes", null, null, 20, 8, ServingsType.Pieces), TestContext.Current.CancellationToken);

        Assert.Equal(20, result.CookTimeMinutes);
        Assert.Equal(8, result.Servings);
        Assert.Equal(ServingsType.Pieces, result.ServingsType);
    }
}

public class UpdateRecipeHandlerTests
{
    private readonly IRepository<Recipe> _repo = Substitute.For<IRepository<Recipe>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateRecipeHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Recipe?)null);
        var result = await new UpdateRecipeHandler(_repo, _unitOfWork, _timeProvider).Handle(new UpdateRecipeCommand(1, "X", null, null, null, null, ServingsType.People), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Recipe { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var result = await new UpdateRecipeHandler(_repo, _unitOfWork, _timeProvider).Handle(new UpdateRecipeCommand(1, "X", null, null, null, null, ServingsType.People), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesFieldsAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Recipe { Id = 1, Name = "Old" };
        _repo.GetById(1).Returns(entity);

        var result = await new UpdateRecipeHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeCommand(1, "New", "https://link.com", "Notes", null, null, ServingsType.People), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal("https://link.com", entity.Link);
        Assert.Equal("Notes", entity.Notes);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UpdatesTimeAndServingsFields()
    {
        var entity = new Recipe { Id = 1, Name = "Old" };
        _repo.GetById(1).Returns(entity);

        await new UpdateRecipeHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeCommand(1, "Old", null, null, 45, 4, ServingsType.Quantity), TestContext.Current.CancellationToken);

        Assert.Equal(45, entity.CookTimeMinutes);
        Assert.Equal(4, entity.Servings);
        Assert.Equal(ServingsType.Quantity, entity.ServingsType);
    }
}

public class DeleteRecipeHandlerTests
{
    private readonly IRepository<Recipe> _repo = Substitute.For<IRepository<Recipe>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteRecipeHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Recipe?)null);
        var result = await new DeleteRecipeHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteRecipeCommand(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Recipe { Id = 1, Name = "Pasta" };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteRecipeHandler(_repo, _unitOfWork, _timeProvider).Handle(new DeleteRecipeCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class ImportRecipeHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IRepository<RecipeStep> _stepRepo = Substitute.For<IRepository<RecipeStep>>();
    private readonly IRepository<RecipeImage> _imageRepo = Substitute.For<IRepository<RecipeImage>>();
    private readonly IImageStorageService _imageStorageService = Substitute.For<IImageStorageService>();
    private readonly IHttpClientFactory _httpClientFactory = Substitute.For<IHttpClientFactory>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<ImportRecipeHandler> _logger = Substitute.For<ILogger<ImportRecipeHandler>>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private ImportRecipeHandler CreateHandler() =>
        new(_recipeRepo, _ingredientRepo, _stepRepo, _imageRepo, _imageStorageService, _httpClientFactory, _unitOfWork, _logger, _timeProvider);

    [Fact]
    public async Task Handle_CreatesRecipeWithIngredientsAndSteps()
    {
        var command = new ImportRecipeCommand(
            "Soup",
            null,
            null,
            new List<ImportRecipeIngredient>
            {
                new("Carrot", 2m, "pcs", null),
                new("Salt", 1m, "tsp", null)
            },
            new List<ImportRecipeStep>
            {
                new("Chop carrots", 1),
                new("Add salt", 2)
            },
            null,
            null,
            null,
            ServingsType.People);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.Equal("Soup", result.Name);
        _recipeRepo.Received(1).Add(Arg.Is<Recipe>(r => r.Name == "Soup"));
        _ingredientRepo.Received(1).AddRange(Arg.Is<IEnumerable<RecipeIngredient>>(i => i.Count() == 2));
        _stepRepo.Received(1).AddRange(Arg.Is<IEnumerable<RecipeStep>>(s => s.Count() == 2));
    }

    [Fact]
    public async Task Handle_ClampsNegativeIngredientAmountsToZero()
    {
        var command = new ImportRecipeCommand(
            "Soup",
            null,
            null,
            new List<ImportRecipeIngredient>
            {
                new("Salt", -5m, "tsp", null)
            },
            new List<ImportRecipeStep>(),
            null,
            null,
            null,
            ServingsType.People);

        await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _ingredientRepo.Received(1).AddRange(Arg.Is<IEnumerable<RecipeIngredient>>(items =>
            items.All(i => i.Amount == 0)));
    }

    [Fact]
    public async Task Handle_WithEmptyIngredientsAndSteps_StillCreatesRecipe()
    {
        var command = new ImportRecipeCommand("Simple Recipe", null, null,
            new List<ImportRecipeIngredient>(),
            new List<ImportRecipeStep>(),
            null,
            null,
            null,
            ServingsType.People);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.Equal("Simple Recipe", result.Name);
        _recipeRepo.Received(1).Add(Arg.Any<Recipe>());
    }
}

public class GetRecipesHandlerTests
{
    private readonly IRepository<Recipe> _repo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();

    public GetRecipesHandlerTests()
    {
        _tagRepo.Query().Returns(new List<RecipeTag>().AsAsyncQueryable());
        _ingredientRepo.Query().Returns(new List<RecipeIngredient>().AsAsyncQueryable());
    }

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedRecipes()
    {
        _repo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, Name = "Pasta" },
            new() { Id = 2, Name = "Deleted", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var result = await new GetRecipesHandler(_repo, _tagRepo, _ingredientRepo).Handle(new GetRecipesQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Pasta", result[0].Name);
    }
}

public class GetRecipeByIdHandlerTests
{
    private readonly IRepository<Recipe> _repo = Substitute.For<IRepository<Recipe>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Recipe?)null);
        var result = await new GetRecipeByIdHandler(_repo).Handle(new GetRecipeByIdQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOkWithRecipe()
    {
        var entity = new Recipe { Id = 1, Name = "Pasta" };
        _repo.GetById(1).Returns(entity);

        var result = await new GetRecipeByIdHandler(_repo).Handle(new GetRecipeByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<Recipe>>(result);
        Assert.Equal("Pasta", ok.Value!.Name);
    }
}

public class AddRecipeIngredientHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public AddRecipeIngredientHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var handler = new AddRecipeIngredientHandler(_recipeRepo, _ingredientRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new AddRecipeIngredientCommand(1, "Flour", 1.5m, "cup", null), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_AddsIngredientAndReturnsCreated()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        var handler = new AddRecipeIngredientHandler(_recipeRepo, _ingredientRepo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new AddRecipeIngredientCommand(1, "Flour", 2m, "cups", "dry"), TestContext.Current.CancellationToken);

        Assert.IsType<Created<RecipeIngredient>>(result);
        _ingredientRepo.Received(1).Add(Arg.Is<RecipeIngredient>(i =>
            i.Name == "Flour" && i.Amount == 2m && i.Unit == "cups" && i.RecipeId == 1));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UpdateRecipeIngredientHandlerTests
{
    private readonly IRepository<RecipeIngredient> _repo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateRecipeIngredientHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((RecipeIngredient?)null);
        var result = await new UpdateRecipeIngredientHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeIngredientCommand(1, 1, "X", null, null, null), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenBelongsToDifferentRecipe_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new RecipeIngredient { Id = 1, RecipeId = 99, Name = "X" });
        var result = await new UpdateRecipeIngredientHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeIngredientCommand(1, 1, "Y", null, null, null), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesFieldsAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new RecipeIngredient { Id = 1, RecipeId = 1, Name = "Old", Amount = 1m, Unit = "cup" };
        _repo.GetById(1).Returns(entity);

        var result = await new UpdateRecipeIngredientHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeIngredientCommand(1, 1, "New", 2m, "tbsp", "wet"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Name);
        Assert.Equal(2m, entity.Amount);
        Assert.Equal("tbsp", entity.Unit);
        Assert.Equal("wet", entity.Group);
    }
}

public class DeleteRecipeIngredientHandlerTests
{
    private readonly IRepository<RecipeIngredient> _repo = Substitute.For<IRepository<RecipeIngredient>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteRecipeIngredientHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((RecipeIngredient?)null);
        var result = await new DeleteRecipeIngredientHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeIngredientCommand(1, 1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new RecipeIngredient { Id = 1, RecipeId = 1, Name = "Flour" };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteRecipeIngredientHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeIngredientCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
    }
}

public class AddRecipeStepHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeStep> _stepRepo = Substitute.For<IRepository<RecipeStep>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public AddRecipeStepHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var result = await new AddRecipeStepHandler(_recipeRepo, _stepRepo, _unitOfWork, _timeProvider)
            .Handle(new AddRecipeStepCommand(1, "Mix well", 1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_AddsStepAndReturnsCreated()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        var result = await new AddRecipeStepHandler(_recipeRepo, _stepRepo, _unitOfWork, _timeProvider)
            .Handle(new AddRecipeStepCommand(1, "Boil water", 1), TestContext.Current.CancellationToken);

        Assert.IsType<Created<RecipeStep>>(result);
        _stepRepo.Received(1).Add(Arg.Is<RecipeStep>(s => s.Text == "Boil water" && s.Order == 1 && s.RecipeId == 1));
    }
}

public class UpdateRecipeStepHandlerTests
{
    private readonly IRepository<RecipeStep> _repo = Substitute.For<IRepository<RecipeStep>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateRecipeStepHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((RecipeStep?)null);
        var result = await new UpdateRecipeStepHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeStepCommand(1, 1, "Text", 1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenBelongsToDifferentRecipe_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new RecipeStep { Id = 1, RecipeId = 99, Text = "X", Order = 1 });
        var result = await new UpdateRecipeStepHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeStepCommand(1, 1, "Y", 2), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesTextAndOrderAndReturnsNoContent()
    {
        var entity = new RecipeStep { Id = 1, RecipeId = 1, Text = "Old", Order = 1 };
        _repo.GetById(1).Returns(entity);

        var result = await new UpdateRecipeStepHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new UpdateRecipeStepCommand(1, 1, "New", 2), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New", entity.Text);
        Assert.Equal(2, entity.Order);
    }
}

public class DeleteRecipeStepHandlerTests
{
    private readonly IRepository<RecipeStep> _repo = Substitute.For<IRepository<RecipeStep>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteRecipeStepHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((RecipeStep?)null);
        var result = await new DeleteRecipeStepHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeStepCommand(1, 1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new RecipeStep { Id = 1, RecipeId = 1, Text = "Mix", Order = 1 };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteRecipeStepHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeStepCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
    }
}

public class AddRecipeTagHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public AddRecipeTagHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var result = await new AddRecipeTagHandler(_recipeRepo, _tagRepo, _unitOfWork, _timeProvider)
            .Handle(new AddRecipeTagCommand(1, "Italian"), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_AddsTagAndReturnsCreated()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        var result = await new AddRecipeTagHandler(_recipeRepo, _tagRepo, _unitOfWork, _timeProvider)
            .Handle(new AddRecipeTagCommand(1, "Italian"), TestContext.Current.CancellationToken);

        Assert.IsType<Created<RecipeTag>>(result);
        _tagRepo.Received(1).Add(Arg.Is<RecipeTag>(t => t.Name == "Italian" && t.RecipeId == 1));
    }
}

public class DeleteRecipeTagHandlerTests
{
    private readonly IRepository<RecipeTag> _repo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteRecipeTagHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((RecipeTag?)null);
        var result = await new DeleteRecipeTagHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeTagCommand(1, 1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new RecipeTag { Id = 1, RecipeId = 1, Name = "Italian" };
        _repo.GetById(1).Returns(entity);

        var result = await new DeleteRecipeTagHandler(_repo, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeTagCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
    }
}

public class GetRecipeIngredientsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeIngredient> _ingredientRepo = Substitute.For<IRepository<RecipeIngredient>>();

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var result = await new GetRecipeIngredientsHandler(_recipeRepo, _ingredientRepo)
            .Handle(new GetRecipeIngredientsQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ReturnsIngredientsForRecipe()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        _ingredientRepo.Query().Returns(new List<RecipeIngredient>
        {
            new() { Id = 1, RecipeId = 1, Name = "Flour" },
            new() { Id = 2, RecipeId = 2, Name = "Other recipe ingredient" }
        }.AsAsyncQueryable());

        var result = await new GetRecipeIngredientsHandler(_recipeRepo, _ingredientRepo)
            .Handle(new GetRecipeIngredientsQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<RecipeIngredient>>>(result);
        Assert.Single(ok.Value!);
        Assert.Equal("Flour", ok.Value![0].Name);
    }
}

public class GetRecipeStepsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeStep> _stepRepo = Substitute.For<IRepository<RecipeStep>>();

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var result = await new GetRecipeStepsHandler(_recipeRepo, _stepRepo).Handle(new GetRecipeStepsQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ReturnsStepsForRecipe()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        _stepRepo.Query().Returns(new List<RecipeStep>
        {
            new() { Id = 1, RecipeId = 1, Text = "Boil", Order = 1 }
        }.AsAsyncQueryable());

        var result = await new GetRecipeStepsHandler(_recipeRepo, _stepRepo).Handle(new GetRecipeStepsQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<RecipeStep>>>(result);
        Assert.Single(ok.Value!);
    }
}

public class GetRecipeTagsHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();

    [Fact]
    public async Task Handle_WhenRecipeNotFound_ReturnsNotFound()
    {
        _recipeRepo.GetById(1).Returns((Recipe?)null);
        var result = await new GetRecipeTagsHandler(_recipeRepo, _tagRepo).Handle(new GetRecipeTagsQuery(1), TestContext.Current.CancellationToken);
        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ReturnsTagsForRecipe()
    {
        _recipeRepo.GetById(1).Returns(new Recipe { Id = 1, Name = "Pasta" });
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "Italian" }
        }.AsAsyncQueryable());

        var result = await new GetRecipeTagsHandler(_recipeRepo, _tagRepo).Handle(new GetRecipeTagsQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<RecipeTag>>>(result);
        Assert.Single(ok.Value!);
    }
}
