using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using Anything.Application.Common;
using Anything.Application.Services.RecipeParsing;
using Anything.Contracts.Recipes;

namespace Anything.Application.Services;

public class RecipeParserService(HttpClient httpClient, IOutboundAddressResolver addressResolver) : IRecipeParserService
{
    public async Task<ParsedRecipeResponse?> ParseFromUrl(string url, CancellationToken ct = default)
    {
        var html = await FetchHtml(url, ct);

        try
        {
            return RecipeJsonLdParser.Parse(html, url) ?? RecipeMicrodataParser.Parse(html, url);
        }
        catch (RegexMatchTimeoutException)
        {
            // A pathological page is "no recipe found", not a server error.
            return null;
        }
    }

    public ParsedRecipeResponse ParseFromText(string? name, string? ingredientsText, string? stepsText)
    {
        var ingredients = SplitLines(ingredientsText)
            .Select(RecipeIngredientParser.Parse)
            .ToList();

        var order = 1;
        var steps = SplitLines(stepsText)
            .Select(line => new ParsedStep(order++, line))
            .ToList();

        var recipeName = string.IsNullOrWhiteSpace(name) ? "Untitled recipe" : name.Trim();

        return new ParsedRecipeResponse(recipeName, null, ingredients, steps, null);
    }

    /// <summary>
    /// Fetches the page with the SSRF guard applied: http(s) only, no
    /// private/loopback/link-local destination, every redirect hop re-validated
    /// (auto-redirect is disabled on this client's handler), and the response
    /// body bounded. Throws <see cref="HttpRequestException"/> on any violation,
    /// which the calling handlers already translate to a 400.
    /// </summary>
    private async Task<string> FetchHtml(string url, CancellationToken ct)
    {
        var uri = await ValidateUrl(url, ct);

        for (var hop = 0; hop <= OutboundUrlGuard.MaxRedirects; hop++)
        {
            using var response = await httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);

            if (IsRedirect(response.StatusCode))
            {
                var location = response.Headers.Location
                    ?? throw new HttpRequestException(OutboundUrlGuard.BlockedUrlMessage);
                uri = await ValidateUrl(new Uri(uri, location).ToString(), ct);
                continue;
            }

            response.EnsureSuccessStatusCode();
            return await ReadBoundedString(response, ct);
        }

        throw new HttpRequestException(OutboundUrlGuard.TooManyRedirectsMessage);
    }

    private async Task<Uri> ValidateUrl(string url, CancellationToken ct)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || !OutboundUrlGuard.IsAllowedScheme(uri))
            throw new HttpRequestException(OutboundUrlGuard.BlockedUrlMessage);

        IPAddress[] addresses;
        try
        {
            addresses = await addressResolver.Resolve(uri.DnsSafeHost, ct);
        }
        catch (SocketException ex)
        {
            throw new HttpRequestException($"Could not resolve host '{uri.DnsSafeHost}'.", ex);
        }

        if (addresses.Length == 0 || Array.Exists(addresses, OutboundUrlGuard.IsBlockedAddress))
            throw new HttpRequestException(OutboundUrlGuard.BlockedUrlMessage);

        return uri;
    }

    private static bool IsRedirect(HttpStatusCode statusCode) =>
        (int)statusCode is >= 300 and < 400 && statusCode != HttpStatusCode.NotModified;

    private static async Task<string> ReadBoundedString(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.Content.Headers.ContentLength is > OutboundUrlGuard.MaxResponseBytes)
            throw new HttpRequestException(OutboundUrlGuard.ResponseTooLargeMessage);

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var buffered = new MemoryStream();
        var buffer = new byte[64 * 1024];
        int read;
        while ((read = await stream.ReadAsync(buffer, ct)) > 0)
        {
            if (buffered.Length + read > OutboundUrlGuard.MaxResponseBytes)
                throw new HttpRequestException(OutboundUrlGuard.ResponseTooLargeMessage);
            buffered.Write(buffer, 0, read);
        }

        return GetResponseEncoding(response).GetString(buffered.GetBuffer(), 0, (int)buffered.Length);
    }

    private static Encoding GetResponseEncoding(HttpResponseMessage response)
    {
        var charset = response.Content.Headers.ContentType?.CharSet?.Trim('"');
        if (string.IsNullOrEmpty(charset))
            return Encoding.UTF8;

        try
        {
            return Encoding.GetEncoding(charset);
        }
        catch (ArgumentException)
        {
            return Encoding.UTF8;
        }
    }

    private static IEnumerable<string> SplitLines(string? text) =>
        string.IsNullOrWhiteSpace(text)
            ? []
            : text.Split('\n')
                .Select(line => line.Trim())
                .Where(line => line.Length > 0);
}
