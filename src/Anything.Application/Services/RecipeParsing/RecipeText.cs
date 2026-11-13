using System.Net;
using System.Text.RegularExpressions;

namespace Anything.Application.Services.RecipeParsing;

/// <summary>
/// Normalises text scraped from recipe pages. Both JSON-LD and microdata
/// values routinely carry HTML entities (<c>&amp;amp;</c>, <c>&amp;nbsp;</c>)
/// and, for instructions, whole HTML fragments.
/// </summary>
internal static class RecipeText
{
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromSeconds(1);

    private static readonly Regex BlockBreakRegex = new(
        @"<br\s*/?>|</(?:p|li|div|h[1-6])\s*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled, RegexTimeout);

    private static readonly Regex TagRegex = new(@"<[^>]+>", RegexOptions.Compiled, RegexTimeout);

    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled, RegexTimeout);

    /// <summary>Strips tags, decodes entities and collapses whitespace into one line.</summary>
    public static string Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";

        var text = WebUtility.HtmlDecode(TagRegex.Replace(value, " "));
        return WhitespaceRegex.Replace(text, " ").Trim();
    }

    /// <summary>
    /// Splits a block of text into its non-empty lines, treating line breaks and
    /// closing block-level tags as separators, and cleans each line.
    /// </summary>
    public static IEnumerable<string> SplitBlocks(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return [];

        return BlockBreakRegex.Replace(value, "\n")
            .Split('\n')
            .Select(Clean)
            .Where(line => line.Length > 0);
    }
}
