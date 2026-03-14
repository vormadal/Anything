using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record DeleteFoodPlanEntryCommand(int EntryId) : IRequest<IResult>;

public class DeleteFoodPlanEntryHandler(
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteFoodPlanEntryCommand, IResult>
{
    private const string EntryNotFound = "Food plan entry not found.";

    public async Task<IResult> Handle(DeleteFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var entry = await entryRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == command.EntryId && e.DeletedOn == null, ct);
        if (entry is null)
            return Results.NotFound(EntryNotFound);

        entry.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
