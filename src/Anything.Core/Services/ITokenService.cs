using Anything.Core.Entities;

namespace Anything.Core.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();

    /// <summary>
    /// Hashes a refresh token for storage/lookup. <see cref="Entities.RefreshToken.Token"/>
    /// stores only this hash — never the raw token — so a database leak doesn't
    /// hand out live sessions. Deterministic (same input always hashes the
    /// same), unlike password hashing, since refresh tokens are looked up by
    /// exact match rather than verified against an untrusted guess.
    /// </summary>
    string HashRefreshToken(string refreshToken);
}
