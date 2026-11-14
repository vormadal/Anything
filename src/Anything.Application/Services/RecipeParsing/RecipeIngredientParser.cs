using System.Globalization;
using System.Text.RegularExpressions;
using Anything.Contracts.Recipes;

namespace Anything.Application.Services.RecipeParsing;

/// <summary>Splits a free-text ingredient line into amount, unit and name.</summary>
internal static class RecipeIngredientParser
{
    private static readonly Regex LeadingNumberRegex = new(
        @"^((?:\d+\s+)?\d+/\d+|\d+(?:[.,]\d+)?)",
        RegexOptions.Compiled, TimeSpan.FromSeconds(1));

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

    public static ParsedIngredient Parse(string raw)
    {
        var text = RecipeText.Clean(raw);
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
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
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
