using Anything.Contracts.Notes;
using Anything.Core.Entities;
using Anything.Core.Notes;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;

namespace Anything.Application.Features.Notes.Commands;

public record CreateNoteCommand(string Title, string? ContentJson) : IRequest<NoteResponse>;

public class CreateNoteHandler(
    IRepository<Note> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IHouseholdContext householdContext)
    : IRequestHandler<CreateNoteCommand, NoteResponse>
{
    public async Task<NoteResponse> Handle(CreateNoteCommand command, CancellationToken ct = default)
    {
        var note = new Note
        {
            HouseholdId = householdContext.HouseholdId,
            Title = command.Title,
            ContentJson = command.ContentJson,
            ContentText = NoteContent.ExtractPlainText(command.ContentJson),
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };

        repository.Add(note);
        await unitOfWork.SaveChanges(ct);

        return NoteMapping.ToResponse(note);
    }
}
