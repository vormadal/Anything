using System.Net;
using Anything.Application.Common;
using Xunit;

namespace Anything.Application.UnitTests.Common;

public class OutboundUrlGuardTests
{
    [Theory]
    [InlineData("10.0.0.5")]          // private
    [InlineData("100.64.0.1")]        // carrier-grade NAT
    [InlineData("127.0.0.1")]         // loopback
    [InlineData("169.254.169.254")]   // link-local / cloud metadata
    [InlineData("172.17.0.2")]        // private (Docker default bridge)
    [InlineData("192.168.1.10")]      // private
    [InlineData("0.0.0.0")]           // unspecified
    [InlineData("255.255.255.255")]   // broadcast
    [InlineData("::1")]               // IPv6 loopback
    [InlineData("fe80::1")]           // IPv6 link-local
    [InlineData("fd12:3456::1")]      // IPv6 unique-local
    [InlineData("::ffff:10.0.0.5")]   // IPv4-mapped IPv6 of a private address
    public void IsBlockedAddress_BlocksInternalRanges(string address) =>
        Assert.True(OutboundUrlGuard.IsBlockedAddress(IPAddress.Parse(address)));

    [Theory]
    [InlineData("93.184.216.34")]
    [InlineData("8.8.8.8")]
    [InlineData("2606:4700::1111")]
    public void IsBlockedAddress_AllowsPublicAddresses(string address) =>
        Assert.False(OutboundUrlGuard.IsBlockedAddress(IPAddress.Parse(address)));

    [Theory]
    [InlineData("http://example.com/", true)]
    [InlineData("https://example.com/", true)]
    [InlineData("ftp://example.com/", false)]
    [InlineData("file:///etc/passwd", false)]
    public void IsAllowedScheme_AllowsOnlyHttp(string url, bool expected) =>
        Assert.Equal(expected, OutboundUrlGuard.IsAllowedScheme(new Uri(url)));
}
