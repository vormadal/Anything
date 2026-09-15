using Anything.Application.Configuration;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.Extensions.Options;

namespace Anything.Application.Notifications;

/// <summary>
/// Holds the process-wide VAPID identity, or nothing at all when push is
/// unconfigured. A singleton because <see cref="VapidAuthentication"/> caches
/// the signed token it hands the push service — rebuilding it per message would
/// re-sign a JWT on every send — and because it is disposable.
/// </summary>
public sealed class VapidCredentials : IDisposable
{
    public VapidCredentials(IOptions<PushSettings> settings)
    {
        var value = settings.Value;
        if (!value.IsConfigured)
            return;

        Authentication = new VapidAuthentication(value.PublicKey!, value.PrivateKey!)
        {
            Subject = value.Subject!
        };
        PublicKey = value.PublicKey;
    }

    /// <summary>Null when push is not configured — every caller treats that as "push off".</summary>
    public VapidAuthentication? Authentication { get; }

    /// <summary>The key browsers need to subscribe; null when push is off.</summary>
    public string? PublicKey { get; }

    public bool IsConfigured => Authentication is not null;

    public void Dispose() => Authentication?.Dispose();
}
