using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Anything.Contracts.Recipes;

namespace Anything.Application.Services.RecipeParsing;

/// <summary>
/// Finds a Schema.org <c>Recipe</c> in a page's JSON-LD blocks. Deliberately
/// tolerant: real sites wrap the Recipe at arbitrary depth (<c>@graph</c>,
/// <c>mainEntity</c>, nested arrays), prefix its type (<c>schema:Recipe</c>),
/// and emit JSON that strict parsers reject (raw newlines inside strings,
/// trailing commas, HTML comment/CDATA wrappers).
/// </summary>
internal static class RecipeJsonLdParser
{
    private const int MaxDepth = 32;
    private const string RecipeType = "Recipe";

    private static readonly Regex JsonLdScriptRegex = new(
        @"<script\b[^>]*\btype\s*=\s*[""']?application/ld\+json[""']?[^>]*>(?<json>.*?)</script\s*>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled,
        TimeSpan.FromSeconds(2));

    private static readonly JsonDocumentOptions ParseOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
        MaxDepth = 128,
    };

    private static readonly (string Open, string Close)[] Wrappers =
    [
        ("<!--", "-->"),
        ("/*<![CDATA[*/", "/*]]>*/"),
        ("//<![CDATA[", "//]]>"),
        ("<![CDATA[", "]]>"),
    ];

    public static ParsedRecipeResponse? Parse(string html, string url)
    {
        foreach (Match match in JsonLdScriptRegex.Matches(html))
        {
            using var doc = TryParse(match.Groups["json"].Value);
            if (doc is null) continue;

            var recipe = FindRecipe(doc.RootElement, 0);
            if (recipe.HasValue)
                return Map(recipe.Value, url);
        }

        return null;
    }

    private static JsonDocument? TryParse(string raw)
    {
        var json = Unwrap(raw);
        foreach (var candidate in new[] { json, EscapeControlCharactersInStrings(json) })
        {
            try
            {
                return JsonDocument.Parse(candidate, ParseOptions);
            }
            catch (JsonException)
            {
                // Try the next, more forgiving candidate.
            }
        }

        return null;
    }

    private static string Unwrap(string raw)
    {
        var json = raw.Trim();
        foreach (var (open, close) in Wrappers)
        {
            if (json.StartsWith(open, StringComparison.Ordinal) && json.EndsWith(close, StringComparison.Ordinal))
                json = json[open.Length..^close.Length].Trim();
        }

        return json;
    }

    /// <summary>
    /// JSON forbids raw control characters inside strings, but CMS templates
    /// often paste multi-line descriptions straight in. Escapes them so the
    /// block parses instead of being silently skipped.
    /// </summary>
    private static string EscapeControlCharactersInStrings(string json)
    {
        var sb = new StringBuilder(json.Length);
        var inString = false;
        var escaped = false;

        foreach (var c in json)
        {
            if (inString && !escaped && c < ' ')
            {
                sb.Append(c switch { '\n' => "\\n", '\r' => "\\r", '\t' => "\\t", _ => " " });
                continue;
            }

            if (escaped) escaped = false;
            else if (c == '\\' && inString) escaped = true;
            else if (c == '"') inString = !inString;

            sb.Append(c);
        }

        return sb.ToString();
    }

    private static JsonElement? FindRecipe(JsonElement element, int depth)
    {
        if (depth > MaxDepth)
            return null;

        if (element.ValueKind == JsonValueKind.Object)
        {
            if (IsRecipeType(element))
                return element;

            foreach (var property in element.EnumerateObject())
            {
                var found = FindRecipe(property.Value, depth + 1);
                if (found.HasValue) return found;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var found = FindRecipe(item, depth + 1);
                if (found.HasValue) return found;
            }
        }

        return null;
    }

    private static bool IsRecipeType(JsonElement element)
    {
        if (!element.TryGetProperty("@type", out var type)) return false;
        return type.ValueKind switch
        {
            JsonValueKind.String => IsRecipeTypeName(type.GetString()),
            JsonValueKind.Array => type.EnumerateArray()
                .Any(t => t.ValueKind == JsonValueKind.String && IsRecipeTypeName(t.GetString())),
            _ => false,
        };
    }

    /// <summary>Matches <c>Recipe</c>, <c>schema:Recipe</c> and <c>https://schema.org/Recipe</c>.</summary>
    private static bool IsRecipeTypeName(string? name)
    {
        if (name is null) return false;
        var local = name[(name.LastIndexOfAny(['/', ':', '#']) + 1)..];
        return local.Equals(RecipeType, StringComparison.OrdinalIgnoreCase);
    }

    private static ParsedRecipeResponse Map(JsonElement recipe, string url)
    {
        var name = RecipeText.Clean(GetFirstString(recipe, "name"));

        var ingredients = GetIngredientLines(recipe)
            .Select(RecipeIngredientParser.Parse)
            .Where(i => i.Name.Length > 0)
            .ToList();

        var stepTexts = new List<string>();
        if (recipe.TryGetProperty("recipeInstructions", out var instructions))
            CollectSteps(instructions, stepTexts, 0);
        var steps = stepTexts.Select((text, i) => new ParsedStep(i + 1, text)).ToList();

        var imageUrl = recipe.TryGetProperty("image", out var image) ? ExtractImageUrl(image, 0) : null;

        return new ParsedRecipeResponse(name.Length > 0 ? name : "Unknown", url, ingredients, steps, imageUrl);
    }

    private static IEnumerable<string> GetIngredientLines(JsonElement recipe)
    {
        // "ingredients" is the pre-2017 Schema.org name, still emitted by older plugins.
        if (!recipe.TryGetProperty("recipeIngredient", out var value) && !recipe.TryGetProperty("ingredients", out value))
            return [];

        return value.ValueKind switch
        {
            JsonValueKind.String => RecipeText.SplitBlocks(value.GetString()),
            JsonValueKind.Array => value.EnumerateArray()
                .Where(v => v.ValueKind == JsonValueKind.String)
                .Select(v => v.GetString() ?? "")
                .ToList(),
            _ => [],
        };
    }

    private static void CollectSteps(JsonElement element, List<string> steps, int depth)
    {
        if (depth > MaxDepth)
            return;

        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                steps.AddRange(RecipeText.SplitBlocks(element.GetString()));
                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                    CollectSteps(item, steps, depth + 1);
                break;
            case JsonValueKind.Object:
                CollectStepObject(element, steps, depth);
                break;
            default:
                break;
        }
    }

    private static void CollectStepObject(JsonElement step, List<string> steps, int depth)
    {
        // HowToSection (or any list-shaped step) — flatten its children; the section title is dropped.
        if (step.TryGetProperty("itemListElement", out var children))
        {
            CollectSteps(children, steps, depth + 1);
            return;
        }

        var text = RecipeText.Clean(GetFirstString(step, "text") ?? GetFirstString(step, "name"));
        if (text.Length > 0)
            steps.Add(text);
    }

    private static string? GetFirstString(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value)) return null;
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Array => value.EnumerateArray()
                .Where(v => v.ValueKind == JsonValueKind.String)
                .Select(v => v.GetString())
                .FirstOrDefault(),
            _ => null,
        };
    }

    private static string? ExtractImageUrl(JsonElement image, int depth)
    {
        if (depth > MaxDepth) return null;

        switch (image.ValueKind)
        {
            case JsonValueKind.String:
                return image.GetString();
            case JsonValueKind.Object:
                return GetFirstString(image, "url") ?? GetFirstString(image, "contentUrl");
            case JsonValueKind.Array:
                foreach (var item in image.EnumerateArray())
                {
                    var url = ExtractImageUrl(item, depth + 1);
                    if (url != null) return url;
                }
                return null;
            default:
                return null;
        }
    }
}
