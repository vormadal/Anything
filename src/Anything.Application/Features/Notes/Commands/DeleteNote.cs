using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notes.Commands;

public record DeleteNoteCommand(int Id) : IRequest<IResult>;

public class DeleteNoteHandler(
    IRepository<Note> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext)
    : IRequestHandler<DeleteNoteCommand, IResult>
{
    public async Task<IResult> Handle(DeleteNoteCommand command, CancellationToken ct = default)
    {
        var note = await repository.Query()
            .Where(n => n.Id == command.Id && n.DeletedOn == null && n.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (note is null)
            return Results.NotFound();

        note.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
