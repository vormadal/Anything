using System.Net;

namespace Anything.Application.Common;

/// <summary>
/// Resolves a hostname to its addresses for <see cref="OutboundUrlGuard"/>
/// checks. An interface (rather than calling <see cref="Dns"/> directly) so
/// unit tests of URL-fetching services don't perform live DNS lookups.
/// </summary>
public interface IOutboundAddressResolver
{
    Task<IPAddress[]> Resolve(string host, CancellationToken ct = default);
}

public sealed class DnsOutboundAddressResolver : IOutboundAddressResolver
{
    public Task<IPAddress[]> Resolve(string host, CancellationToken ct = default) =>
        Dns.GetHostAddressesAsync(host, ct);
}
