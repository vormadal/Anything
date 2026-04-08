using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpsertFoodPlanNoteCommand(DateOnly Date, string Note) : IRequest<IResult>;

public class UpsertFoodPlanNoteHandler(
    IRepository<FoodPlanNote> noteRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpsertFoodPlanNoteCommand, IResult>
{
    public async Task<IResult> Handle(UpsertFoodPlanNoteCommand command, CancellationToken ct = default)
    {
        var existing = await noteRepository.Query()
            .FirstOrDefaultAsync(n => n.Date == command.Date && n.HouseholdId == householdContext.HouseholdId, ct);

        if (existing is null)
        {
            var note = new FoodPlanNote
            {
                HouseholdId = householdContext.HouseholdId,
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
