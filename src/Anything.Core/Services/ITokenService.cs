using Anything.Core.Entities;

namespace Anything.Core.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
