using Anything.Application.Services;
using Xunit;

namespace Anything.Application.UnitTests.Services;

public class RecipeParserServiceTests
{
    private static RecipeParserService CreateService(string html)
    {
        var handler = new FakeHttpMessageHandler(html);
        return new RecipeParserService(new HttpClient(handler));
    }

    private static string WrapInHtml(string jsonLd) =>
        $"<html><head><script type=\"application/ld+json\">{jsonLd}</script></head></html>";

    // --- Basic parsing ---

    [Fact]
    public async Task ParseFromUrl_WithValidRecipe_ReturnsNameAndLink()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"Chocolate Cake","recipeIngredient":[],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com/cake");

        Assert.NotNull(result);
        Assert.Equal("Chocolate Cake", result.Name);
        Assert.Equal("https://example.com/cake", result.Link);
    }

    [Fact]
    public async Task ParseFromUrl_WithNoRecipeJsonLd_ReturnsNull()
    {
        var result = await CreateService("<html><body>No recipe</body></html>").ParseFromUrl("https://example.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task ParseFromUrl_WithMalformedJsonLd_ReturnsNull()
    {
        var html = "<html><head><script type=\"application/ld+json\">{bad json}</script></head></html>";

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task ParseFromUrl_WithNoNameField_DefaultsToUnknown()
    {
        var html = WrapInHtml("""{"@type":"Recipe","recipeIngredient":[],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Unknown", result.Name);
    }

    // --- @graph wrapper ---

    [Fact]
    public async Task ParseFromUrl_WithGraphWrapper_FindsRecipe()
    {
        var html = WrapInHtml("""{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Graph Recipe","recipeIngredient":[],"recipeInstructions":[]}]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Graph Recipe", result.Name);
    }

    [Fact]
    public async Task ParseFromUrl_WithTypeArray_FindsRecipe()
    {
        var html = WrapInHtml("""{"@type":["WebPage","Recipe"],"name":"Array Type Recipe","recipeIngredient":[],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Array Type Recipe", result.Name);
    }

    // --- Ingredient parsing ---

    [Theory]
    [InlineData("1/2 cup flour", 0.5, "cup", "flour")]
    [InlineData("1 1/2 tbsp butter", 1.5, "tbsp", "butter")]
    [InlineData("2 cups sugar", 2.0, "cups", "sugar")]
    [InlineData("3 eggs", 3.0, null, "eggs")]
    [InlineData("1.5 oz chocolate", 1.5, "oz", "chocolate")]
    [InlineData("salt to taste", null, null, "salt to taste")]
    [InlineData("2 tsk salt", 2.0, "tsk", "salt")]
    [InlineData("1 spsk olive oil", 1.0, "spsk", "olive oil")]
    [InlineData("3 stk carrots", 3.0, "stk", "carrots")]
    public async Task ParseFromUrl_ParsesIngredient(
        string ingredient, double? expectedAmount, string? expectedUnit, string expectedName)
    {
        var html = WrapInHtml($$"""{"@type":"Recipe","name":"T","recipeIngredient":["{{ingredient}}"],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        var parsed = Assert.Single(result.Ingredients);
        Assert.Equal(expectedAmount.HasValue ? (decimal?)expectedAmount.Value : null, parsed.Amount);
        Assert.Equal(expectedUnit, parsed.Unit);
        Assert.Equal(expectedName, parsed.Name);
    }

    [Fact]
    public async Task ParseFromUrl_ParsesMixedNumberAmount()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":["1 1/2 cups flour"],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        var parsed = Assert.Single(result.Ingredients);
        Assert.Equal(1.5m, parsed.Amount);
        Assert.Equal("cups", parsed.Unit);
        Assert.Equal("flour", parsed.Name);
    }

    // --- Step parsing ---

    [Fact]
    public async Task ParseFromUrl_WithStringInstructions_ParsesAsOneStep()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":"Mix everything together."}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        var step = Assert.Single(result.Steps);
        Assert.Equal(1, step.Order);
        Assert.Equal("Mix everything together.", step.Text);
    }

    [Fact]
    public async Task ParseFromUrl_WithHowToStepArray_ParsesEachStep()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":[{"@type":"HowToStep","text":"Step one"},{"@type":"HowToStep","text":"Step two"}]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(2, result.Steps.Count);
        Assert.Equal("Step one", result.Steps[0].Text);
        Assert.Equal(1, result.Steps[0].Order);
        Assert.Equal("Step two", result.Steps[1].Text);
        Assert.Equal(2, result.Steps[1].Order);
    }

    [Fact]
    public async Task ParseFromUrl_WithHowToSection_FlattensSubsteps()
    {
        var html = WrapInHtml("""
            {"@type":"Recipe","name":"T","recipeIngredient":[],
            "recipeInstructions":[
                {"@type":"HowToSection","itemListElement":[
                    {"@type":"HowToStep","text":"Sub A"},
                    {"@type":"HowToStep","text":"Sub B"}
                ]},
                {"@type":"HowToStep","text":"Final"}
            ]}
            """);

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(3, result.Steps.Count);
        Assert.Equal("Sub A", result.Steps[0].Text);
        Assert.Equal("Sub B", result.Steps[1].Text);
        Assert.Equal("Final", result.Steps[2].Text);
    }

    [Fact]
    public async Task ParseFromUrl_WithStringArrayInstructions_ParsesEachString()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":["First step","Second step"]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(2, result.Steps.Count);
        Assert.Equal("First step", result.Steps[0].Text);
        Assert.Equal("Second step", result.Steps[1].Text);
    }

    [Fact]
    public async Task ParseFromUrl_WithStepHavingNameButNoText_UsesName()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":[{"@type":"HowToStep","name":"Step name only"}]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        var step = Assert.Single(result.Steps);
        Assert.Equal("Step name only", step.Text);
    }

    // --- ParseFromText ---

    private static RecipeParserService CreateTextService() =>
        new(new HttpClient(new FakeHttpMessageHandler("")));

    [Theory]
    [InlineData("2 spsk smør", 2.0, "spsk", "smør")]
    [InlineData("1 tsk salt", 1.0, "tsk", "salt")]
    [InlineData("2 dl fløde", 2.0, "dl", "fløde")]
    [InlineData("1 1/2 cups flour", 1.5, "cups", "flour")]
    [InlineData("3 eggs", 3.0, null, "eggs")]
    [InlineData("salt to taste", null, null, "salt to taste")]
    public void ParseFromText_ParsesIngredientLine(
        string line, double? expectedAmount, string? expectedUnit, string expectedName)
    {
        var result = CreateTextService().ParseFromText("T", line, null);

        var parsed = Assert.Single(result.Ingredients);
        Assert.Equal(expectedAmount.HasValue ? (decimal?)expectedAmount.Value : null, parsed.Amount);
        Assert.Equal(expectedUnit, parsed.Unit);
        Assert.Equal(expectedName, parsed.Name);
    }

    [Fact]
    public void ParseFromText_SplitsLinesAndSkipsBlanks()
    {
        var result = CreateTextService().ParseFromText(
            "Pandekager",
            "250 g mel\r\n\r\n  5 dl mælk  \n3 eggs\n",
            "Whisk the batter.\n\nRest for 30 minutes.\nFry thin pancakes.");

        Assert.Equal("Pandekager", result.Name);
        Assert.Null(result.Link);
        Assert.Null(result.ImageUrl);

        Assert.Equal(3, result.Ingredients.Count);
        Assert.Equal("mel", result.Ingredients[0].Name);
        Assert.Equal("g", result.Ingredients[0].Unit);
        Assert.Equal(250m, result.Ingredients[0].Amount);
        Assert.Equal("mælk", result.Ingredients[1].Name);
        Assert.Equal("dl", result.Ingredients[1].Unit);

        Assert.Equal(3, result.Steps.Count);
        Assert.Equal(new[] { 1, 2, 3 }, result.Steps.Select(s => s.Order));
        Assert.Equal("Whisk the batter.", result.Steps[0].Text);
        Assert.Equal("Rest for 30 minutes.", result.Steps[1].Text);
        Assert.Equal("Fry thin pancakes.", result.Steps[2].Text);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ParseFromText_WithBlankName_DefaultsToUntitled(string? name)
    {
        var result = CreateTextService().ParseFromText(name, "1 tsk salt", null);

        Assert.Equal("Untitled recipe", result.Name);
    }

    [Fact]
    public void ParseFromText_WithBlankBodies_ReturnsEmptyLists()
    {
        var result = CreateTextService().ParseFromText("Only a name", "  ", null);

        Assert.Empty(result.Ingredients);
        Assert.Empty(result.Steps);
    }
}

file class FakeHttpMessageHandler(string content) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent(content, System.Text.Encoding.UTF8, "text/html")
        });
}
