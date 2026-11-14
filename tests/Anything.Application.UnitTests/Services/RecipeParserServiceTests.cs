using System.Net;
using Anything.Application.Common;
using Anything.Application.Services;
using Xunit;

namespace Anything.Application.UnitTests.Services;

public class RecipeParserServiceTests
{
    private static RecipeParserService CreateService(string html)
    {
        var handler = new FakeHttpMessageHandler(html);
        return new RecipeParserService(new HttpClient(handler), new FakePublicAddressResolver());
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
        new(new HttpClient(new FakeHttpMessageHandler("")), new FakePublicAddressResolver());

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

    // --- Tolerant JSON-LD extraction (issue #809) ---

    private const string MinimalRecipe = """{"@type":"Recipe","name":"Found","recipeIngredient":["1 tsk salt"],"recipeInstructions":["Mix"]}""";

    [Fact]
    public async Task ParseFromUrl_WithLdJsonLinkBeforeScript_StillFindsScriptBlock()
    {
        // A non-script element mentioning the MIME type used to swallow the real block.
        var html = $"""<html><head><link rel="alternate" type="application/ld+json" href="/x.json"><script type="application/ld+json">{MinimalRecipe}</script></head></html>""";

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
    }

    [Theory]
    [InlineData("<script type='application/ld+json'>")]
    [InlineData("<script type=application/ld+json>")]
    [InlineData("<script id=\"schema\" type=\"application/ld+json\" class=\"yoast-schema-graph\">")]
    public async Task ParseFromUrl_WithScriptTagVariants_FindsRecipe(string openTag)
    {
        var html = $"<html><head>{openTag}{MinimalRecipe}</script></head></html>";

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
    }

    [Fact]
    public async Task ParseFromUrl_WithRawNewlineInsideString_FindsRecipe()
    {
        var html = WrapInHtml("{\"@type\":\"Recipe\",\"name\":\"Found\",\"description\":\"Line one\nLine two\",\"recipeIngredient\":[],\"recipeInstructions\":[]}");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
    }

    [Fact]
    public async Task ParseFromUrl_WithTrailingCommas_FindsRecipe()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"Found","recipeIngredient":["1 tsk salt",],"recipeInstructions":[],}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Single(result.Ingredients);
    }

    [Fact]
    public async Task ParseFromUrl_WithCdataWrapper_FindsRecipe()
    {
        var html = WrapInHtml($"/*<![CDATA[*/{MinimalRecipe}/*]]>*/");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ParseFromUrl_WithRecipeNestedUnderMainEntity_FindsRecipe()
    {
        var html = WrapInHtml($$"""[{"@type":"WebSite"},{"@type":"WebPage","mainEntity":{{MinimalRecipe}} }]""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
    }

    [Theory]
    [InlineData("schema:Recipe")]
    [InlineData("https://schema.org/Recipe")]
    [InlineData("http://schema.org/Recipe")]
    public async Task ParseFromUrl_WithPrefixedRecipeType_FindsRecipe(string type)
    {
        var html = WrapInHtml($$"""{"@type":"{{type}}","name":"Found","recipeIngredient":[],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ParseFromUrl_SkipsNonRecipeBlocksBeforeRecipe()
    {
        var html = $$"""<script type="application/ld+json">{"@type":"Organization","name":"Arla"}</script><script type="application/ld+json">{{MinimalRecipe}}</script>""";

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
    }

    [Fact]
    public async Task ParseFromUrl_WithNameAsArray_UsesFirstName()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":["Marry me chicken","Alt"],"recipeIngredient":[],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Marry me chicken", result.Name);
    }

    [Fact]
    public async Task ParseFromUrl_DecodesHtmlEntitiesInIngredients()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"Pasta &amp; burrata","recipeIngredient":["2 dl fl&oslash;de","1&nbsp;tsk salt"],"recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Pasta & burrata", result.Name);
        Assert.Equal("fløde", result.Ingredients[0].Name);
        Assert.Equal("dl", result.Ingredients[0].Unit);
        Assert.Equal("tsk", result.Ingredients[1].Unit);
    }

    [Fact]
    public async Task ParseFromUrl_WithIngredientsAsSingleString_SplitsLines()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":"200 g pasta\n1 burrata","recipeInstructions":[]}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(2, result.Ingredients.Count);
        Assert.Equal("pasta", result.Ingredients[0].Name);
    }

    [Fact]
    public async Task ParseFromUrl_WithHtmlInstructionsString_SplitsIntoSteps()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":"<p>Boil the pasta.</p><p>Add the <b>sauce</b> and stir.</p>"}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(new[] { "Boil the pasta.", "Add the sauce and stir." }, result.Steps.Select(s => s.Text));
        Assert.Equal(new[] { 1, 2 }, result.Steps.Select(s => s.Order));
    }

    [Fact]
    public async Task ParseFromUrl_WithNestedHowToSections_FlattensSteps()
    {
        var html = WrapInHtml("""
            {"@type":"Recipe","name":"T","recipeIngredient":[],"recipeInstructions":{"@type":"HowToSection","itemListElement":[
              {"@type":["HowToSection"],"itemListElement":[{"@type":"HowToStep","text":"Inner"}]},
              {"@type":"HowToStep","text":"Outer"}]}}
            """);

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal(new[] { "Inner", "Outer" }, result.Steps.Select(s => s.Text));
    }

    [Fact]
    public async Task ParseFromUrl_WithImageObjectContentUrl_ReturnsImage()
    {
        var html = WrapInHtml("""{"@type":"Recipe","name":"T","image":{"@type":"ImageObject","contentUrl":"https://example.com/a.jpg"}}""");

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("https://example.com/a.jpg", result.ImageUrl);
    }

    // --- Microdata fallback ---

    [Fact]
    public async Task ParseFromUrl_WithMicrodataOnly_ParsesRecipe()
    {
        const string html = """
            <html><head><meta itemprop="name" content="Not in scope"></head><body>
            <div itemscope itemtype="https://schema.org/Recipe">
              <h1 itemprop="name">Pasta med tomatsauce</h1>
              <img itemprop="image" src="https://example.com/pasta.jpg" alt="">
              <ul>
                <li itemprop="recipeIngredient">200 g <span>pasta</span></li>
                <li itemprop="recipeIngredient">1 burrata</li>
              </ul>
              <div itemprop="recipeInstructions"><p>Boil pasta.</p><p>Serve.</p></div>
            </div></body></html>
            """;

        var result = await CreateService(html).ParseFromUrl("https://example.com/pasta");

        Assert.NotNull(result);
        Assert.Equal("Pasta med tomatsauce", result.Name);
        Assert.Equal("https://example.com/pasta.jpg", result.ImageUrl);
        Assert.Equal(2, result.Ingredients.Count);
        Assert.Equal(200m, result.Ingredients[0].Amount);
        Assert.Equal("g", result.Ingredients[0].Unit);
        Assert.Equal("pasta", result.Ingredients[0].Name);
        Assert.Equal(new[] { "Boil pasta.", "Serve." }, result.Steps.Select(s => s.Text));
    }

    [Fact]
    public async Task ParseFromUrl_WithEmptyMicrodataRecipe_ReturnsNull()
    {
        const string html = """<div itemscope itemtype="http://schema.org/Recipe"><span itemprop="name">Only a name</span></div>""";

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.Null(result);
    }

    [Fact]
    public async Task ParseFromUrl_PrefersJsonLdOverMicrodata()
    {
        var html = $"""
            <script type="application/ld+json">{MinimalRecipe}</script>
            <div itemscope itemtype="https://schema.org/Recipe"><li itemprop="recipeIngredient">2 eggs</li></div>
            """;

        var result = await CreateService(html).ParseFromUrl("https://example.com");

        Assert.NotNull(result);
        Assert.Equal("Found", result.Name);
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

/// <summary>Resolves every host to a public address so tests never do live DNS.</summary>
file class FakePublicAddressResolver : IOutboundAddressResolver
{
    public Task<IPAddress[]> Resolve(string host, CancellationToken ct = default) =>
        Task.FromResult(new[] { IPAddress.Parse("93.184.216.34") });
}
