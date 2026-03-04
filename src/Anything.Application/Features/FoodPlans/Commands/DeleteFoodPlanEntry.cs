using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record DeleteFoodPlanEntryCommand(int FoodPlanId, int EntryId) : IRequest<IResult>;

public class DeleteFoodPlanEntryHandler(
    IRepository<FoodPlan> foodPlanRepository,
    IRepository<FoodPlanEntry> entryRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteFoodPlanEntryCommand, IResult>
{
    private const string FoodPlanNotFound = "Food plan not found.";
    private const string EntryNotFound = "Food plan entry not found.";

    public async Task<IResult> Handle(DeleteFoodPlanEntryCommand command, CancellationToken ct = default)
    {
        var plan = await foodPlanRepository.GetById(command.FoodPlanId);
        if (plan is null || plan.DeletedOn != null)
            return Results.NotFound(FoodPlanNotFound);

        var entry = await entryRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == command.EntryId && e.FoodPlanId == command.FoodPlanId && e.DeletedOn == null, ct);
        if (entry is null)
            return Results.NotFound(EntryNotFound);

        entry.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        entryRepository.Update(entry);
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
