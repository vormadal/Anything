using Anything.Contracts.Notes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notes.Queries;

public record GetNoteByIdQuery(int Id) : IRequest<NoteResponse?>;

public class GetNoteByIdHandler(IRepository<Note> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetNoteByIdQuery, NoteResponse?>
{
    public async Task<NoteResponse?> Handle(GetNoteByIdQuery query, CancellationToken ct = default)
    {
        var note = await repository.Query().AsNoTracking()
            .Where(n => n.Id == query.Id && n.DeletedOn == null && n.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);

        return note is null ? null : NoteMapping.ToResponse(note);
    }
}
