using Anything.Contracts.Auth;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Auth.Commands;

public record CreateInviteCommand(string Email, int UserId, string UserRole) : IRequest<IResult>;

public class CreateInviteHandler(
    IRepository<User> userRepository,
    IRepository<UserInvite> inviteRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<CreateInviteCommand, IResult>
{
    public async Task<IResult> Handle(CreateInviteCommand command, CancellationToken ct = default)
    {
        if (command.UserRole != Core.Constants.UserRoles.Admin)
            return Results.Forbid();

        var existingUser = await userRepository.Query()
            .Where(u => u.Email == command.Email)
            .AnyAsync(ct);

        if (existingUser)
            return Results.BadRequest("User with this email already exists.");

        var token = Guid.NewGuid().ToString();
        var invite = new UserInvite
        {
            Email = command.Email,
            Token = token,
            ExpiresAt = timeProvider.GetUtcNow().AddDays(7).UtcDateTime,
            CreatedByUserId = command.UserId,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        inviteRepository.Add(invite);
        await unitOfWork.SaveChanges(ct);

        return Results.Ok(new CreateInviteResponse($"/register?token={token}", token));
    }
}
