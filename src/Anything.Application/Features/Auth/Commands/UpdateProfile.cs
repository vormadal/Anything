using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Auth.Commands;

public record UpdateProfileCommand(int UserId, string Name) : IRequest<IResult>;

public class UpdateProfileHandler(
    IRepository<User> userRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateProfileCommand, IResult>
{
    public async Task<IResult> Handle(UpdateProfileCommand command, CancellationToken ct = default)
    {
        var userEntity = await userRepository.GetById(command.UserId);
        if (userEntity == null || userEntity.DeletedOn != null)
            return Results.NotFound();

        userEntity.Name = command.Name;
        userEntity.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
