using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<IResult>;

public class LoginHandler(
    IRepository<User> userRepository,
    IRepository<RefreshToken> refreshTokenRepository,
    IUnitOfWork unitOfWork,
    IPasswordService passwordService,
    ITokenService tokenService,
    TimeProvider timeProvider) : IRequestHandler<LoginCommand, IResult>
{
    public async Task<IResult> Handle(LoginCommand command, CancellationToken ct = default)
    {
        var user = await userRepository.Query()
            .Where(u => u.Email == command.Email && u.DeletedOn == null)
            .FirstOrDefaultAsync(ct);

        if (user == null || !passwordService.VerifyPassword(command.Password, user.PasswordHash))
            return Results.Unauthorized();

        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = timeProvider.GetUtcNow().AddDays(7).UtcDateTime
        };

        refreshTokenRepository.Add(refreshTokenEntity);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new Contracts.Auth.LoginResponse(
            accessToken,
            refreshToken,
            user.Email,
            user.Name,
            user.Role
        ));
    }
}
