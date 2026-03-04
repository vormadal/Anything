using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Auth.Commands;

public record DeleteInviteCommand(int Id, string UserRole) : IRequest<IResult>;

public class DeleteInviteHandler(
    IRepository<UserInvite> inviteRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteInviteCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInviteCommand command, CancellationToken ct = default)
    {
        if (command.UserRole != Core.Constants.UserRoles.Admin)
            return Results.Forbid();

        var invite = await inviteRepository.GetById(command.Id);
        if (invite is null)
            return Results.NotFound();

        inviteRepository.Remove(invite);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
