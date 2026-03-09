using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Auth.Commands;

public record ChangePasswordCommand(int UserId, string CurrentPassword, string NewPassword) : IRequest<IResult>;

public class ChangePasswordHandler(
    IRepository<User> userRepository,
    IUnitOfWork unitOfWork,
    IPasswordService passwordService,
    TimeProvider timeProvider) : IRequestHandler<ChangePasswordCommand, IResult>
{
    public async Task<IResult> Handle(ChangePasswordCommand command, CancellationToken ct = default)
    {
        var userEntity = await userRepository.GetById(command.UserId);
        if (userEntity == null || userEntity.DeletedOn != null)
            return Results.NotFound();

        if (!passwordService.VerifyPassword(command.CurrentPassword, userEntity.PasswordHash))
            return Results.Problem("Current password is incorrect.", statusCode: StatusCodes.Status400BadRequest);

        userEntity.PasswordHash = passwordService.HashPassword(command.NewPassword);
        userEntity.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
