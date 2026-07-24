using Anything.Contracts.Notes;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Notes.Queries;

/// <summary>
/// Lists the household's notes, most recently touched first.
/// <paramref name="Limit"/> caps the result for callers that only need the top
/// few (the home card); omit it for the full list page.
/// </summary>
public record GetNotesQuery(int? Limit = null) : IRequest<List<NoteSummaryResponse>>;

public class GetNotesHandler(IRepository<Note> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetNotesQuery, List<NoteSummaryResponse>>
{
    public async Task<List<NoteSummaryResponse>> Handle(GetNotesQuery query, CancellationToken ct = default)
    {
        var notes = repository.Query()
            .Where(n => n.DeletedOn == null && n.HouseholdId == householdContext.HouseholdId)
            .OrderByDescending(n => n.ModifiedOn ?? n.CreatedOn);

        var limited = query.Limit is > 0 ? notes.Take(query.Limit.Value) : notes;

        return (await limited.ToListAsync(ct))
            .Select(NoteMapping.ToSummary)
            .ToList();
    }
}
