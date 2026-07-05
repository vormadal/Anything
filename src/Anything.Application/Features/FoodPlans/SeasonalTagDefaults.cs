using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.FoodPlans;

/// <summary>
/// Default seasonal tag rules seeded once per household so season/holiday-aware
/// suggestions work before the household customizes anything. All seeded rows
/// are ordinary <see cref="SeasonalTagRule"/> rows the household can edit or delete.
/// </summary>
public static class SeasonalTagDefaults
{
    public const int SeasonBoost = 10;
    public const int HolidayBoost = 15;

    public static List<SeasonalTagRule> CreateDefaults(int householdId, DateTime now)
    {
        var winter = MonthMask(12, 1, 2);
        var spring = MonthMask(3, 4, 5);
        var summer = MonthMask(6, 7, 8);
        var autumn = MonthMask(9, 10, 11);
        var december = MonthMask(12);
        var easterWindow = MonthMask(3, 4);

        return
        [
            Rule(householdId, now, "vinter", winter, SeasonBoost),
            Rule(householdId, now, "winter", winter, SeasonBoost),
            Rule(householdId, now, "forår", spring, SeasonBoost),
            Rule(householdId, now, "spring", spring, SeasonBoost),
            Rule(householdId, now, "sommer", summer, SeasonBoost),
            Rule(householdId, now, "summer", summer, SeasonBoost),
            Rule(householdId, now, "efterår", autumn, SeasonBoost),
            Rule(householdId, now, "autumn", autumn, SeasonBoost),
            Rule(householdId, now, "fall", autumn, SeasonBoost),
            Rule(householdId, now, "jul", december, HolidayBoost),
            Rule(householdId, now, "jule", december, HolidayBoost, matchPrefix: true),
            Rule(householdId, now, "christmas", december, HolidayBoost),
            Rule(householdId, now, "xmas", december, HolidayBoost),
            Rule(householdId, now, "påske", easterWindow, HolidayBoost, matchPrefix: true),
            Rule(householdId, now, "easter", easterWindow, HolidayBoost)
        ];
    }

    /// <summary>
    /// Returns the household's active seasonal tag rules, seeding the defaults on first use
    /// (tracked via <see cref="FoodPlanSettings.SeasonalTagsSeededOn"/>).
    /// </summary>
    public static async Task<List<SeasonalTagRule>> GetOrSeedRules(
        IRepository<SeasonalTagRule> ruleRepository,
        IRepository<FoodPlanSettings> settingsRepository,
        IHouseholdContext householdContext,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        var settings = await settingsRepository.Query()
            .FirstOrDefaultAsync(s => s.HouseholdId == householdContext.HouseholdId, ct);

        if (settings?.SeasonalTagsSeededOn is null)
        {
            var now = timeProvider.GetUtcNow().UtcDateTime;
            if (settings is null)
            {
                settings = new FoodPlanSettings
                {
                    HouseholdId = householdContext.HouseholdId,
                    CreatedOn = now
                };
                settingsRepository.Add(settings);
            }
            else
            {
                settings.ModifiedOn = now;
                settingsRepository.Update(settings);
            }

            settings.SeasonalTagsSeededOn = now;
            ruleRepository.AddRange(CreateDefaults(householdContext.HouseholdId, now));
            await unitOfWork.SaveChanges(ct);
        }

        return await ruleRepository.Query()
            .Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .OrderBy(r => r.Keyword)
            .ToListAsync(ct);
    }

    private static int MonthMask(params int[] months) =>
        months.Aggregate(0, (mask, month) => mask | (1 << (month - 1)));

    private static SeasonalTagRule Rule(
        int householdId, DateTime now, string keyword, int months, int boost, bool matchPrefix = false) =>
        new()
        {
            HouseholdId = householdId,
            Keyword = keyword,
            MatchPrefix = matchPrefix,
            Months = months,
            Boost = boost,
            CreatedOn = now
        };
}
