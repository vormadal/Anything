using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record DeleteFoodPlanNoteCommand(int NoteId) : IRequest<IResult>;

public class DeleteFoodPlanNoteHandler(
    IRepository<FoodPlanNote> noteRepository,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteFoodPlanNoteCommand, IResult>
{
    private const string NoteNotFound = "Food plan note not found.";

    public async Task<IResult> Handle(DeleteFoodPlanNoteCommand command, CancellationToken ct = default)
    {
        var note = await noteRepository.Query()
            .FirstOrDefaultAsync(n => n.Id == command.NoteId, ct);

        if (note is null)
            return Results.NotFound(NoteNotFound);

        noteRepository.Remove(note);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
