using System.Net;

namespace Anything.Application.Common;

/// <summary>
/// SSRF guard for server-side fetches of user-supplied URLs (see the
/// "server-side fetches" rule in this project's agent.md). Pure checks only —
/// DNS resolution is injected via <see cref="IOutboundAddressResolver"/> so
/// callers stay unit-testable.
/// </summary>
public static class OutboundUrlGuard
{
    public const int MaxRedirects = 5;
    public const int MaxResponseBytes = 5 * 1024 * 1024;

    public const string BlockedUrlMessage = "The provided URL is not allowed.";
    public const string TooManyRedirectsMessage = "The provided URL redirected too many times.";
    public const string ResponseTooLargeMessage = "The provided URL's response is too large.";

    private static readonly IPNetwork[] BlockedNetworks =
    [
        IPNetwork.Parse("0.0.0.0/8"),      // "this network"
        IPNetwork.Parse("10.0.0.0/8"),     // private
        IPNetwork.Parse("100.64.0.0/10"),  // carrier-grade NAT
        IPNetwork.Parse("127.0.0.0/8"),    // loopback
        IPNetwork.Parse("169.254.0.0/16"), // link-local (incl. cloud metadata)
        IPNetwork.Parse("172.16.0.0/12"),  // private (Docker networks live here)
        IPNetwork.Parse("192.168.0.0/16"), // private
        IPNetwork.Parse("198.18.0.0/15"),  // benchmarking
        IPNetwork.Parse("224.0.0.0/3"),    // multicast, reserved, broadcast
        IPNetwork.Parse("::/128"),         // unspecified
        IPNetwork.Parse("::1/128"),        // loopback
        IPNetwork.Parse("fc00::/7"),       // unique-local
        IPNetwork.Parse("fe80::/10"),      // link-local
        IPNetwork.Parse("ff00::/8")        // multicast
    ];

    public static bool IsAllowedScheme(Uri uri) =>
        uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;

    public static bool IsBlockedAddress(IPAddress address)
    {
        var normalized = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        return Array.Exists(BlockedNetworks, network =>
            network.BaseAddress.AddressFamily == normalized.AddressFamily && network.Contains(normalized));
    }
}
