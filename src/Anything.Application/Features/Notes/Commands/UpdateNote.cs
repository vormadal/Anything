using Anything.Core.Entities;
using Anything.Core.Notes;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notes.Commands;

public record UpdateNoteCommand(int Id, string Title, string? ContentJson) : IRequest<IResult>;

public class UpdateNoteHandler(
    IRepository<Note> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext)
    : IRequestHandler<UpdateNoteCommand, IResult>
{
    public async Task<IResult> Handle(UpdateNoteCommand command, CancellationToken ct = default)
    {
        var note = await repository.Query()
            .Where(n => n.Id == command.Id && n.DeletedOn == null && n.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (note is null)
            return Results.NotFound();

        note.Title = command.Title;
        note.ContentJson = command.ContentJson;
        note.ContentText = NoteContent.ExtractPlainText(command.ContentJson);
        note.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
