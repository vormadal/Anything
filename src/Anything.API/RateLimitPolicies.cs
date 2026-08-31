namespace Anything.API;

/// <summary>Named rate-limiter policies registered in Program.cs.</summary>
public static class RateLimitPolicies
{
    /// <summary>
    /// Per-client-IP fixed window for the anonymous auth endpoints
    /// (login/refresh/register) — they do BCrypt work per request and are the
    /// credential-stuffing surface. Limits come from the "RateLimiting:Auth"
    /// config section; integration tests raise them via the test factory.
    /// </summary>
    public const string Auth = "auth";
}
