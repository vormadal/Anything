using System.Net;
using Anything.Application.Common;
using Anything.Application.Services;
using Xunit;

namespace Anything.Application.UnitTests.Services;

/// <summary>
/// Covers the SSRF guard around <see cref="RecipeParserService.ParseFromUrl"/>:
/// scheme allowlist, blocked destination addresses, per-redirect-hop
/// re-validation, the redirect cap and the response-size cap.
/// </summary>
public class RecipeParserServiceSsrfTests
{
    private const string PublicHost = "public.example.com";
    private const string InternalHost = "internal.example.com";

    private static RecipeParserService CreateService(HttpMessageHandler handler) =>
        new(new HttpClient(handler), new MapAddressResolver());

    [Theory]
    [InlineData("ftp://example.com/recipe")]
    [InlineData("file:///etc/passwd")]
    [InlineData("gopher://example.com/")]
    [InlineData("not a url")]
    public async Task ParseFromUrl_WithNonHttpScheme_Throws(string url)
    {
        var service = CreateService(new StaticResponseHandler("<html></html>"));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => service.ParseFromUrl(url));
        Assert.Equal(OutboundUrlGuard.BlockedUrlMessage, ex.Message);
    }

    [Theory]
    [InlineData("http://127.0.0.1/recipe")]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("http://[::1]/recipe")]
    public async Task ParseFromUrl_WithBlockedIpLiteral_Throws(string url)
    {
        var service = CreateService(new StaticResponseHandler("<html></html>"));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => service.ParseFromUrl(url));
        Assert.Equal(OutboundUrlGuard.BlockedUrlMessage, ex.Message);
    }

    [Fact]
    public async Task ParseFromUrl_WithHostResolvingToPrivateAddress_Throws()
    {
        var service = CreateService(new StaticResponseHandler("<html></html>"));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => service.ParseFromUrl($"https://{InternalHost}/recipe"));
        Assert.Equal(OutboundUrlGuard.BlockedUrlMessage, ex.Message);
    }

    [Fact]
    public async Task ParseFromUrl_WithRedirectToBlockedHost_Throws()
    {
        var handler = new RedirectHandler($"https://{InternalHost}/recipe");
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => service.ParseFromUrl($"https://{PublicHost}/recipe"));
        Assert.Equal(OutboundUrlGuard.BlockedUrlMessage, ex.Message);
        Assert.Equal(1, handler.Requests);
    }

    [Fact]
    public async Task ParseFromUrl_WithEndlessRedirects_Throws()
    {
        var handler = new RedirectHandler($"https://{PublicHost}/next");
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => service.ParseFromUrl($"https://{PublicHost}/recipe"));
        Assert.Equal(OutboundUrlGuard.TooManyRedirectsMessage, ex.Message);
        Assert.Equal(OutboundUrlGuard.MaxRedirects + 1, handler.Requests);
    }

    [Fact]
    public async Task ParseFromUrl_WithOversizedResponse_Throws()
    {
        var oversized = new byte[OutboundUrlGuard.MaxResponseBytes + 1];
        var service = CreateService(new StaticResponseHandler(oversized));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(
            () => service.ParseFromUrl($"https://{PublicHost}/recipe"));
        Assert.Equal(OutboundUrlGuard.ResponseTooLargeMessage, ex.Message);
    }

    [Fact]
    public async Task ParseFromUrl_WithSingleAllowedRedirect_FollowsIt()
    {
        const string html = """
            <html><head><script type="application/ld+json">
            {"@type":"Recipe","name":"Redirected Cake"}
            </script></head></html>
            """;
        var service = CreateService(new RedirectOnceHandler($"https://{PublicHost}/final", html));

        var result = await service.ParseFromUrl($"https://{PublicHost}/recipe");

        Assert.NotNull(result);
        Assert.Equal("Redirected Cake", result.Name);
    }

    /// <summary>Public IP for <see cref="PublicHost"/>, private for everything else.</summary>
    private sealed class MapAddressResolver : IOutboundAddressResolver
    {
        public Task<IPAddress[]> Resolve(string host, CancellationToken ct = default) =>
            Task.FromResult(new[]
            {
                host == PublicHost ? IPAddress.Parse("93.184.216.34") : IPAddress.Parse("10.0.0.5")
            });
    }

    private sealed class StaticResponseHandler : HttpMessageHandler
    {
        private readonly byte[] _body;

        public StaticResponseHandler(string html) : this(System.Text.Encoding.UTF8.GetBytes(html)) { }

        public StaticResponseHandler(byte[] body) => _body = body;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(_body)
            });
    }

    private sealed class RedirectHandler(string location) : HttpMessageHandler
    {
        public int Requests { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests++;
            var response = new HttpResponseMessage(HttpStatusCode.Redirect);
            response.Headers.Location = new Uri(location);
            return Task.FromResult(response);
        }
    }

    private sealed class RedirectOnceHandler(string location, string html) : HttpMessageHandler
    {
        private bool _redirected;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (!_redirected)
            {
                _redirected = true;
                var redirect = new HttpResponseMessage(HttpStatusCode.Redirect);
                redirect.Headers.Location = new Uri(location);
                return Task.FromResult(redirect);
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(html, System.Text.Encoding.UTF8, "text/html")
            });
        }
    }
}
