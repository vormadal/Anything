using System.Text.Json;
using System.Text.RegularExpressions;
using Anything.Contracts.Recipes;

namespace Anything.Application.Services;

public class RecipeParserService(HttpClient httpClient) : IRecipeParserService
{
    private static readonly Regex LeadingNumberRegex = new(
        @"^((?:\d+\s+)?\d+/\d+|\d+(?:[.,]\d+)?)",
        RegexOptions.Compiled);

    private static readonly HashSet<string> KnownUnits = new(StringComparer.OrdinalIgnoreCase)
    {
        "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
        "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "gram", "grams",
        "kg", "kilogram", "kilograms", "ml", "milliliter", "milliliters", "l", "liter", "liters", "dl",
        "clove", "cloves", "can", "cans", "package", "packages", "pkg", "bunch", "bunches",
        "slice", "slices", "piece", "pieces", "pinch", "handful", "dash",
        "head", "stalk", "stalks", "sprig", "sprigs",
        "tsk", "spsk", "stk"
    };

    public async Task<ParsedRecipeResponse?> ParseFromUrl(string url, CancellationToken ct = default)
    {
        var html = await httpClient.GetStringAsync(url, ct);

        foreach (var json in ExtractJsonLdBlocks(html))
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var recipe = FindRecipeElement(doc.RootElement);
                if (recipe.HasValue)
                    return MapToResponse(recipe.Value, url);
            }
            catch (JsonException)
            {
                // Skip malformed JSON-LD blocks
            }
        }

        return null;
    }

    public ParsedRecipeResponse ParseFromText(string? name, string? ingredientsText, string? stepsText)
    {
        var ingredients = SplitLines(ingredientsText)
            .Select(ParseIngredient)
            .ToList();

        var order = 1;
        var steps = SplitLines(stepsText)
            .Select(line => new ParsedStep(order++, line))
            .ToList();

        var recipeName = string.IsNullOrWhiteSpace(name) ? "Untitled recipe" : name.Trim();

        return new ParsedRecipeResponse(recipeName, null, ingredients, steps, null);
    }

    private static IEnumerable<string> SplitLines(string? text) =>
        string.IsNullOrWhiteSpace(text)
            ? []
            : text.Split('\n')
                .Select(line => line.Trim())
                .Where(line => line.Length > 0);

    private static IEnumerable<string> ExtractJsonLdBlocks(string html)
    {
        const string marker = "application/ld+json";
        var pos = 0;
        while (true)
        {
            var start = html.IndexOf(marker, pos, StringComparison.OrdinalIgnoreCase);
            if (start < 0) yield break;

            var gtPos = html.IndexOf('>', start);
            if (gtPos < 0) yield break;

            var contentStart = gtPos + 1;
            var contentEnd = html.IndexOf("</script>", contentStart, StringComparison.OrdinalIgnoreCase);
            if (contentEnd >= 0)
                yield return html[contentStart..contentEnd].Trim();

            pos = contentEnd >= 0 ? contentEnd + 1 : contentStart;
        }
    }

    private static JsonElement? FindRecipeElement(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Object)
        {
            if (IsRecipeType(root))
                return root;

            if (root.TryGetProperty("@graph", out var graph) && graph.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in graph.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object && IsRecipeType(item))
                        return item;
                }
            }
        }
        else if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
            {
                var found = FindRecipeElement(item);
                if (found.HasValue) return found;
            }
        }

        return null;
    }

    private static bool IsRecipeType(JsonElement element)
    {
        if (!element.TryGetProperty("@type", out var type)) return false;
        if (type.ValueKind == JsonValueKind.String)
            return type.GetString()?.Equals("Recipe", StringComparison.OrdinalIgnoreCase) == true;
        if (type.ValueKind == JsonValueKind.Array)
            return type.EnumerateArray().Any(t =>
                t.ValueKind == JsonValueKind.String &&
                t.GetString()?.Equals("Recipe", StringComparison.OrdinalIgnoreCase) == true);
        return false;
    }

    private static ParsedRecipeResponse MapToResponse(JsonElement recipe, string url)
    {
        var name = recipe.TryGetProperty("name", out var n) ? n.GetString() ?? "Unknown" : "Unknown";

        var ingredients = new List<ParsedIngredient>();
        if (recipe.TryGetProperty("recipeIngredient", out var ingArray) && ingArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var ing in ingArray.EnumerateArray())
            {
                if (ing.ValueKind == JsonValueKind.String)
                    ingredients.Add(ParseIngredient(ing.GetString() ?? ""));
            }
        }

        var steps = new List<ParsedStep>();
        if (recipe.TryGetProperty("recipeInstructions", out var instructions))
            steps = ParseInstructions(instructions);

        var imageUrl = recipe.TryGetProperty("image", out var image) ? ExtractImageUrl(image) : null;

        return new ParsedRecipeResponse(name, url, ingredients, steps, imageUrl);
    }

    private static string? ExtractImageUrl(JsonElement image)
    {
        if (image.ValueKind == JsonValueKind.String)
            return image.GetString();

        if (image.ValueKind == JsonValueKind.Object)
            return image.TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;

        if (image.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in image.EnumerateArray())
            {
                var url = ExtractImageUrl(item);
                if (url != null) return url;
            }
        }

        return null;
    }

    private static List<ParsedStep> ParseInstructions(JsonElement instructions)
    {
        var steps = new List<ParsedStep>();
        var order = 1;

        if (instructions.ValueKind == JsonValueKind.String)
        {
            steps.Add(new ParsedStep(order, instructions.GetString() ?? ""));
            return steps;
        }

        if (instructions.ValueKind != JsonValueKind.Array)
            return steps;

        foreach (var item in instructions.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                steps.Add(new ParsedStep(order++, item.GetString() ?? ""));
            }
            else if (item.ValueKind == JsonValueKind.Object)
            {
                var itemType = item.TryGetProperty("@type", out var t) ? t.GetString() : null;
                if (itemType?.Equals("HowToSection", StringComparison.OrdinalIgnoreCase) == true)
                {
                    if (item.TryGetProperty("itemListElement", out var subSteps) && subSteps.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var subStep in subSteps.EnumerateArray())
                        {
                            var text = GetStepText(subStep);
                            if (text != null)
                                steps.Add(new ParsedStep(order++, text));
                        }
                    }
                }
                else
                {
                    var text = GetStepText(item);
                    if (text != null)
                        steps.Add(new ParsedStep(order++, text));
                }
            }
        }

        return steps;
    }

    private static string? GetStepText(JsonElement step)
    {
        if (step.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
            return text.GetString();
        if (step.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
            return name.GetString();
        return null;
    }

    private static ParsedIngredient ParseIngredient(string raw)
    {
        var text = raw.Trim();
        var amountMatch = LeadingNumberRegex.Match(text);
        if (!amountMatch.Success)
            return new ParsedIngredient(null, null, text);

        var amount = ParseAmount(amountMatch.Value.Trim());
        var rest = text[amountMatch.Length..].TrimStart();
        var firstWord = rest.Split(' ', 2)[0];

        if (KnownUnits.Contains(firstWord))
        {
            var name = rest.Length > firstWord.Length ? rest[(firstWord.Length + 1)..] : rest;
            return new ParsedIngredient(amount, firstWord.ToLowerInvariant(), name);
        }

        return new ParsedIngredient(amount, null, rest);
    }

    private static decimal ParseAmount(string amountStr)
    {
        var parts = amountStr.Trim().Split(' ', 2);

        if (parts.Length == 2)
        {
            // Mixed number: "1 1/2"
            var whole = decimal.TryParse(parts[0], out var w) ? w : 0;
            var fraction = ParseFraction(parts[1]);
            return whole + fraction;
        }

        return ParseFraction(amountStr) is decimal f and > 0
            ? f
            : decimal.TryParse(amountStr.Replace(',', '.'),
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var result) ? result : 0;
    }

    private static decimal ParseFraction(string s)
    {
        var slash = s.IndexOf('/');
        if (slash < 0) return 0;
        return decimal.TryParse(s[..slash], out var num) && decimal.TryParse(s[(slash + 1)..], out var den) && den != 0
            ? num / den
            : 0;
    }
}
