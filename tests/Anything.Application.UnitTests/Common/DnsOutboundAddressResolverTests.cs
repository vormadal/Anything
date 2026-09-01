using System.Net;
using Anything.Application.Common;
using Xunit;

namespace Anything.Application.UnitTests.Common;

public class DnsOutboundAddressResolverTests
{
    [Fact]
    public async Task Resolve_Localhost_ReturnsLoopback()
    {
        // "localhost" resolves via the hosts file, so this needs no network.
        var addresses = await new DnsOutboundAddressResolver()
            .Resolve("localhost", TestContext.Current.CancellationToken);

        Assert.NotEmpty(addresses);
        Assert.All(addresses, a => Assert.True(IPAddress.IsLoopback(a)));
    }
}
