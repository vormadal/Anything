using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans.Commands;

public record UpdateFoodPlanSettingsCommand(int ActiveDays) : IRequest<IResult>;

public class UpdateFoodPlanSettingsHandler(
    IRepository<FoodPlanSettings> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateFoodPlanSettingsCommand, IResult>
{
    public async Task<IResult> Handle(UpdateFoodPlanSettingsCommand command, CancellationToken ct = default)
    {
        var settings = await repository.Query().FirstOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = new FoodPlanSettings
            {
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
