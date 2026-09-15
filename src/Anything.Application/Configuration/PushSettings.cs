namespace Anything.Application.Configuration;

/// <summary>
/// VAPID credentials for Web Push. Deliberately has no <c>[Required]</c> and no
/// checked-in default: push is opt-in per deployment, and an instance that
/// never sets these must start and run exactly as before, with the feature
/// reporting itself unavailable rather than failing at startup. That is also
/// why <see cref="ProductionSecretsGuard"/> says nothing about it — there is no
/// dev default to accidentally ship.
/// <para>
/// Generate a key pair with <c>npx web-push generate-vapid-keys</c> (or any
/// P-256 generator producing base64url). The public key is served to browsers;
/// the private key must come from the environment, never a config file.
/// Rotating the pair invalidates every existing subscription — clients
/// re-subscribe on next load, and the stale rows are pruned on their next 404.
/// </para>
/// </summary>
public class PushSettings
{
    public const string SectionName = "Push";

    /// <summary>Base64url P-256 public key, handed to the browser as `applicationServerKey`.</summary>
    public string? PublicKey { get; init; }

    /// <summary>Base64url P-256 private key. Environment-only.</summary>
    public string? PrivateKey { get; init; }

    /// <summary>
    /// VAPID `sub` claim — a `mailto:` or `https:` URL the push service can use
    /// to contact whoever runs this deployment. Required by the spec; some push
    /// services reject a token without it.
    /// </summary>
    public string? Subject { get; init; }

    /// <summary>
    /// Push is live only with a complete pair. Every caller checks this instead
    /// of assuming configuration, so a half-configured deployment degrades to
    /// "push unavailable" rather than throwing per notification.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PublicKey)
        && !string.IsNullOrWhiteSpace(PrivateKey)
        && !string.IsNullOrWhiteSpace(Subject);
}
