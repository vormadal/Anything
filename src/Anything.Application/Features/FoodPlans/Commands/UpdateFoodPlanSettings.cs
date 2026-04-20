using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanSettingsCommand(int ActiveDays) : IRequest<IResult>;

public class UpdateFoodPlanSettingsHandler(
    IRepository<FoodPlanSettings> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanSettingsCommand, IResult>
{
    public async Task<IResult> Handle(UpdateFoodPlanSettingsCommand command, CancellationToken ct = default)
    {
        var settings = await repository.Query()
            .FirstOrDefaultAsync(s => s.HouseholdId == householdContext.HouseholdId, ct);
        if (settings is null)
        {
            settings = new FoodPlanSettings
            {
                HouseholdId = householdContext.HouseholdId,
                ActiveDays = command.ActiveDays,
                CreatedOn = timeProvider.GetUtcNow().UtcDateTime
            };
            repository.Add(settings);
        }
        else
        {
            settings.ActiveDays = command.ActiveDays;
            settings.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
            repository.Update(settings);
        }

        await unitOfWork.SaveChanges(ct);
        return Results.Ok(settings);
    }
}
