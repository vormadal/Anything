using System.Text.RegularExpressions;
using Anything.Contracts.Recipes;

namespace Anything.Application.Services.RecipeParsing;

/// <summary>
/// Fallback for pages that mark their recipe up with Schema.org microdata
/// (<c>itemtype=".../Recipe"</c> + <c>itemprop</c> attributes) instead of JSON-LD.
/// Regex-based, so it reads an element's content only up to the first closing
/// tag of the same name — good enough for the flat <c>li</c>/<c>span</c>
/// markup recipe plugins emit, not a general HTML parser.
/// </summary>
internal static class RecipeMicrodataParser
{
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromSeconds(2);

    private static readonly Regex RecipeScopeRegex = new(
        @"\bitemtype\s*=\s*[""']https?://schema\.org/Recipe/?[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled, RegexTimeout);

    private static readonly Regex ItemPropRegex = new(
        // Void tags (meta/link/img/source) never close, so they skip the content
        // group — otherwise each one would scan to the end of the page for a closer.
        @"<(?:(?<void>meta|link|img|source)|(?<tag>[a-z][a-z0-9]*))\b(?<attrs>[^>]*\bitemprop\s*=\s*[""'](?<props>[^""']*)[""'][^>]*)>(?(void)|(?<inner>.*?)</\k<tag>\s*>)",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled, RegexTimeout);

    private static readonly Regex ValueAttributeRegex = new(
        @"\b(?:content|src|href)\s*=\s*[""'](?<value>[^""']*)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled, RegexTimeout);

    public static ParsedRecipeResponse? Parse(string html, string url)
    {
        var scope = RecipeScopeRegex.Match(html);
        if (!scope.Success)
            return null;

        var props = ReadItemProps(html[scope.Index..]);

        var ingredients = Values(props, "recipeIngredient", "ingredients")
            .Select(RecipeIngredientParser.Parse)
            .Where(i => i.Name.Length > 0)
            .ToList();

        var steps = Values(props, "recipeInstructions")
            .SelectMany(RecipeText.SplitBlocks)
            .Select((text, i) => new ParsedStep(i + 1, text))
            .ToList();

        // A Recipe itemtype with neither ingredients nor steps is a stray marker, not a recipe.
        if (ingredients.Count == 0 && steps.Count == 0)
            return null;

        var name = RecipeText.Clean(Values(props, "name").FirstOrDefault());
        var imageUrl = Values(props, "image").FirstOrDefault();

        return new ParsedRecipeResponse(name.Length > 0 ? name : "Unknown", url, ingredients, steps, imageUrl);
    }

    private static List<(string[] Props, string Value)> ReadItemProps(string html)
    {
        var result = new List<(string[], string)>();
        foreach (Match match in ItemPropRegex.Matches(html))
        {
            var props = match.Groups["props"].Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            // <meta content>, <img src> and <link href> carry their value in an attribute.
            var value = match.Groups["void"].Success
                ? ReadValueAttribute(match.Groups["attrs"].Value)
                : match.Groups["inner"].Value;

            result.Add((props, value));
        }

        return result;
    }

    private static string ReadValueAttribute(string attributes)
    {
        var attribute = ValueAttributeRegex.Match(attributes);
        return attribute.Success ? attribute.Groups["value"].Value : "";
    }

    private static IEnumerable<string> Values(List<(string[] Props, string Value)> props, params string[] names) =>
        props
            .Where(p => p.Props.Any(prop => names.Contains(prop, StringComparer.OrdinalIgnoreCase)))
            .Select(p => p.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v));
}
