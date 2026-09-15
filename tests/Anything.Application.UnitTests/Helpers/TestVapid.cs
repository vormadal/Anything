using System.Security.Cryptography;
using Anything.Application.Configuration;
using Anything.Application.Notifications;
using Microsoft.Extensions.Options;

namespace Anything.Application.UnitTests.Helpers;

/// <summary>
/// VAPID credentials for tests. <see cref="Configured"/> generates a genuinely
/// valid P-256 pair per call rather than using a placeholder string:
/// <c>VapidAuthentication</c> parses its keys when it is constructed, so a fake
/// would throw inside the helper rather than in the code under test — and a
/// real key literal in the repo is what secret scanning exists to catch.
/// </summary>
public static class TestVapid
{
    public static VapidCredentials Configured()
    {
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var parameters = ecdsa.ExportParameters(includePrivateParameters: true);

        // Uncompressed point (0x04 || X || Y) is the encoding VAPID expects.
        var publicKey = new byte[65];
        publicKey[0] = 0x04;
        parameters.Q.X!.CopyTo(publicKey, 1);
        parameters.Q.Y!.CopyTo(publicKey, 33);

        return new VapidCredentials(Options.Create(new PushSettings
        {
            PublicKey = Base64Url(publicKey),
            PrivateKey = Base64Url(parameters.D!),
            Subject = "mailto:ops@example.com"
        }));
    }

    public static VapidCredentials Unconfigured() => new(Options.Create(new PushSettings()));

    /// <summary>Base64url without padding — the encoding VAPID and Web Push keys use.</summary>
    public static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
