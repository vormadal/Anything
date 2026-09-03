using System.Security.Cryptography;

namespace Anything.Application.Common;

/// <summary>
/// CSPRNG token generation for bearer-style secrets embedded in URLs
/// (household invites, recipe share links). <see cref="Guid.NewGuid"/> is
/// random in practice but not contractually a CSPRNG — this is the same
/// <see cref="RandomNumberGenerator"/> pattern <c>TokenService.GenerateRefreshToken</c>
/// already uses for refresh tokens.
/// </summary>
public static class SecureTokenGenerator
{
    /// <summary>Generates a URL-safe hex token. 32 bytes (256 bits) by default — plenty for an unguessable link.</summary>
    public static string GenerateHexToken(int byteLength = 32)
    {
        var bytes = new byte[byteLength];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
