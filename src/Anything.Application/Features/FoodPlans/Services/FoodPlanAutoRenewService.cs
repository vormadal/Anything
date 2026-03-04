using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Anything.Application.Features.FoodPlans.Services;

public class FoodPlanAutoRenewService(
    IServiceScopeFactory scopeFactory,
    TimeProvider timeProvider,
    ILogger<FoodPlanAutoRenewService> logger) : BackgroundService
{
    private const int DaysInWeek = 7;
    private const int DaysBeforeNextWeek = 6;
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAutoRenewAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing food plan auto-renew.");
            }

            // Wait until the next UTC midnight before running again
            var now = timeProvider.GetUtcNow();
            var nextMidnight = now.Date.AddDays(1);
            await Task.Delay(nextMidnight - now.DateTime, stoppingToken);
        }
    }

    internal async Task ProcessAutoRenewAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IRepository<FoodPlan>>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var today = timeProvider.GetUtcNow().Date;

        var plans = await repository.Query()
            .Where(p => p.AutoRenew && p.DeletedOn == null)
            .ToListAsync(ct);

        foreach (var plan in plans)
        {
            var nextWeekStart = plan.WeekStart.Date.AddDays(DaysInWeek);

            // Create the next plan on the day before the new week starts (WeekStart + 6)
            if (today >= plan.WeekStart.Date.AddDays(DaysBeforeNextWeek))
            {
                var nextPlanExists = await repository.Query()
                    .AnyAsync(p => p.DeletedOn == null && p.WeekStart.Date == nextWeekStart, ct);

                if (!nextPlanExists)
                {
                    repository.Add(new FoodPlan
                    {
                        Name = plan.Name,
                        WeekStart = nextWeekStart,
                        ActiveDays = plan.ActiveDays,
                        AutoRenew = true,
                        CreatedOn = timeProvider.GetUtcNow().UtcDateTime
                    });

                    logger.LogInformation(
                        "Auto-created food plan '{Name}' for week starting {WeekStart}",
                        plan.Name, nextWeekStart);
                }
            }

            // Soft-delete this plan the day after its last day (WeekStart + 7)
            if (today >= plan.WeekStart.Date.AddDays(DaysInWeek))
            {
                plan.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
                repository.Update(plan);

                logger.LogInformation(
                    "Auto-deleted food plan '{Name}' for week starting {WeekStart}",
                    plan.Name, plan.WeekStart);
            }
        }

        await unitOfWork.SaveChanges(ct);
    }
}
