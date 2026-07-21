using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Recipes;

public class GetTopRecipeTagsHandlerTests
{
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public GetTopRecipeTagsHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
    }

    [Fact]
    public async Task Handle_ReturnsTagsOrderedByCountThenName()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" },
            new() { Id = 2, HouseholdId = 1, Name = "R2" },
            new() { Id = 3, HouseholdId = 1, Name = "R3" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "vegetarian" },
            new() { Id = 2, RecipeId = 2, Name = "vegetarian" },
            new() { Id = 3, RecipeId = 3, Name = "vegetarian" },
            new() { Id = 4, RecipeId = 1, Name = "quick" },
            new() { Id = 5, RecipeId = 2, Name = "quick" },
            new() { Id = 6, RecipeId = 1, Name = "spicy" }
        }.AsAsyncQueryable());

        var result = await new GetTopRecipeTagsHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetTopRecipeTagsQuery(10), TestContext.Current.CancellationToken);

        Assert.Equal(["vegetarian", "quick", "spicy"], result.Select(t => t.Name));
        Assert.Equal(3, result[0].Count);
    }

    [Fact]
    public async Task Handle_GroupsCaseInsensitively()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" },
            new() { Id = 2, HouseholdId = 1, Name = "R2" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "Pasta" },
            new() { Id = 2, RecipeId = 2, Name = "pasta" }
        }.AsAsyncQueryable());

        var result = await new GetTopRecipeTagsHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetTopRecipeTagsQuery(10), TestContext.Current.CancellationToken);

        var pasta = Assert.Single(result);
        Assert.Equal("pasta", pasta.Name);
        Assert.Equal(2, pasta.Count);
    }

    [Fact]
    public async Task Handle_ExcludesTagsFromOtherHouseholds()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "Mine" },
            new() { Id = 2, HouseholdId = 2, Name = "Other" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "mine" },
            new() { Id = 2, RecipeId = 2, Name = "other" }
        }.AsAsyncQueryable());

        var result = await new GetTopRecipeTagsHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetTopRecipeTagsQuery(10), TestContext.Current.CancellationToken);

        var tag = Assert.Single(result);
        Assert.Equal("mine", tag.Name);
    }

    [Fact]
    public async Task Handle_RespectsCountLimit()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "a" },
            new() { Id = 2, RecipeId = 1, Name = "b" },
            new() { Id = 3, RecipeId = 1, Name = "c" }
        }.AsAsyncQueryable());

        var result = await new GetTopRecipeTagsHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetTopRecipeTagsQuery(2), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
    }
}

public class GetRecipeTagCatalogHandlerTests
{
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public GetRecipeTagCatalogHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
    }

    [Fact]
    public async Task Handle_ReturnsAllTagsOrderedAlphabetically()
    {
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>
        {
            new() { Id = 1, RecipeId = 1, Name = "zucchini" },
            new() { Id = 2, RecipeId = 1, Name = "apple" }
        }.AsAsyncQueryable());

        var result = await new GetRecipeTagCatalogHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetRecipeTagCatalogQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(["apple", "zucchini"], result.Select(t => t.Name));
    }

    [Fact]
    public async Task Handle_ReturnsEmptyListWhenNoTags()
    {
        _recipeRepo.Query().Returns(new List<Recipe>().AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>().AsAsyncQueryable());

        var result = await new GetRecipeTagCatalogHandler(_tagRepo, _recipeRepo, _householdContext)
            .Handle(new GetRecipeTagCatalogQuery(), TestContext.Current.CancellationToken);

        Assert.Empty(result);
    }
}

public class RenameRecipeTagHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public RenameRecipeTagHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNoMatchingTags_ReturnsNotFound()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "R1" } }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>().AsAsyncQueryable());

        var result = await new RenameRecipeTagHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new RenameRecipeTagCommand("dinner", "supper"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_RenamesTagAcrossAllMatchingRecipes()
    {
        var tag1 = new RecipeTag { Id = 1, RecipeId = 1, Name = "dinner" };
        var tag2 = new RecipeTag { Id = 2, RecipeId = 2, Name = "Dinner" };
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" },
            new() { Id = 2, HouseholdId = 1, Name = "R2" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag> { tag1, tag2 }.AsAsyncQueryable());

        var result = await new RenameRecipeTagHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new RenameRecipeTagCommand("dinner", "supper"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("supper", tag1.Name);
        Assert.Equal("supper", tag2.Name);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTargetNameAlreadyExistsOnRecipe_MergesInsteadOfDuplicating()
    {
        var dinnerTag = new RecipeTag { Id = 1, RecipeId = 1, Name = "dinner" };
        var supperTag = new RecipeTag { Id = 2, RecipeId = 1, Name = "supper" };
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "R1" } }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag> { dinnerTag, supperTag }.AsAsyncQueryable());

        var result = await new RenameRecipeTagHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new RenameRecipeTagCommand("dinner", "supper"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(dinnerTag.DeletedOn);
        Assert.Null(supperTag.DeletedOn);
        Assert.Equal("supper", supperTag.Name);
    }
}

public class DeleteRecipeTagByNameHandlerTests
{
    private readonly IRepository<Recipe> _recipeRepo = Substitute.For<IRepository<Recipe>>();
    private readonly IRepository<RecipeTag> _tagRepo = Substitute.For<IRepository<RecipeTag>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteRecipeTagByNameHandlerTests()
    {
        _householdContext.HouseholdId.Returns(1);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNoMatchingTags_ReturnsNotFound()
    {
        _recipeRepo.Query().Returns(new List<Recipe> { new() { Id = 1, HouseholdId = 1, Name = "R1" } }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag>().AsAsyncQueryable());

        var result = await new DeleteRecipeTagByNameHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeTagByNameCommand("dinner"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_SoftDeletesAllMatchingTagsCaseInsensitively()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var tag1 = new RecipeTag { Id = 1, RecipeId = 1, Name = "dinner" };
        var tag2 = new RecipeTag { Id = 2, RecipeId = 2, Name = "Dinner" };
        _recipeRepo.Query().Returns(new List<Recipe>
        {
            new() { Id = 1, HouseholdId = 1, Name = "R1" },
            new() { Id = 2, HouseholdId = 1, Name = "R2" }
        }.AsAsyncQueryable());
        _tagRepo.Query().Returns(new List<RecipeTag> { tag1, tag2 }.AsAsyncQueryable());

        var result = await new DeleteRecipeTagByNameHandler(_recipeRepo, _tagRepo, _householdContext, _unitOfWork, _timeProvider)
            .Handle(new DeleteRecipeTagByNameCommand("dinner"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, tag1.DeletedOn);
        Assert.Equal(now.UtcDateTime, tag2.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
