using Anything.Contracts.Auth;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken) : IRequest<IResult>;

public class RefreshTokenHandler(
    IRepository<User> userRepository,
    IRepository<Core.Entities.RefreshToken> refreshTokenRepository,
    IUnitOfWork unitOfWork,
    ITokenService tokenService,
    TimeProvider timeProvider) : IRequestHandler<RefreshTokenCommand, IResult>
{
    public async Task<IResult> Handle(RefreshTokenCommand command, CancellationToken ct = default)
    {
        var refreshToken = await refreshTokenRepository.Query()
            .Where(rt => rt.Token == command.RefreshToken && !rt.IsRevoked)
            .FirstOrDefaultAsync(ct);

        if (refreshToken == null || refreshToken.ExpiresAt < timeProvider.GetUtcNow().UtcDateTime)
            return Results.Unauthorized();

        var user = await userRepository.GetById(refreshToken.UserId);
        if (user == null || user.DeletedOn != null)
            return Results.Unauthorized();

        var newAccessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();

        refreshToken.IsRevoked = true;
        var newRefreshTokenEntity = new Core.Entities.RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshToken,
            ExpiresAt = timeProvider.GetUtcNow().AddDays(7).UtcDateTime,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        refreshTokenRepository.Add(newRefreshTokenEntity);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new RefreshTokenResponse(newAccessToken, newRefreshToken));
    }
}
