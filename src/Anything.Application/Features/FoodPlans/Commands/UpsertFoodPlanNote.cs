using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpsertFoodPlanNoteCommand(DateTime Date, string Note) : IRequest<IResult>;

public class UpsertFoodPlanNoteHandler(
    IRepository<FoodPlanNote> noteRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpsertFoodPlanNoteCommand, IResult>
{
    public async Task<IResult> Handle(UpsertFoodPlanNoteCommand command, CancellationToken ct = default)
    {
        var existing = await noteRepository.Query()
            .FirstOrDefaultAsync(n => n.Date == command.Date, ct);

        if (existing is null)
        {
            var note = new FoodPlanNote
            {
                Date = command.Date,
                Note = command.Note,
                CreatedOn = timeProvider.GetUtcNow().UtcDateTime
            };
            noteRepository.Add(note);
            await unitOfWork.SaveChanges(ct);
            return Results.Created($"/api/food-plan/notes/{note.Id}", note);
        }

        existing.Note = command.Note;
        existing.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        noteRepository.Update(existing);
        await unitOfWork.SaveChanges(ct);
        return Results.Ok(existing);
    }
}
