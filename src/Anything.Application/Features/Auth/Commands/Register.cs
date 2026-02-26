using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record RegisterCommand(string Email, string Password, string Name, string InviteToken) : IRequest<IResult>;

public class RegisterHandler(
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IUnitOfWork unitOfWork,
    IPasswordService passwordService,
    TimeProvider timeProvider) : IRequestHandler<RegisterCommand, IResult>
{
    public async Task<IResult> Handle(RegisterCommand command, CancellationToken ct = default)
    {
        var invite = await inviteRepository.Query()
            .Where(i => i.Token == command.InviteToken && !i.IsUsed)
            .FirstOrDefaultAsync(ct);

        if (invite == null || invite.ExpiresAt < timeProvider.GetUtcNow().UtcDateTime || invite.Email != command.Email)
            return Results.BadRequest("Invalid or expired invite token.");

        var existingUser = await userRepository.Query()
            .Where(u => u.Email == command.Email)
            .AnyAsync(ct);

        if (existingUser)
            return Results.BadRequest("User already exists.");

        var user = new User
        {
            Email = command.Email,
            PasswordHash = passwordService.HashPassword(command.Password),
            Name = command.Name,
            Role = UserRoles.User
        };

        invite.IsUsed = true;
        userRepository.Add(user);
        await unitOfWork.SaveChanges(ct);

        return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email, user.Name });
    }
}
