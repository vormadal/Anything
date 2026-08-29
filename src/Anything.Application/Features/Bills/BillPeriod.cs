using Anything.Core.Entities;

namespace Anything.Application.Features.Bills;

/// <summary>
/// Utility for normalizing and computing billing periods based on payment frequency.
/// </summary>
internal static class BillPeriod
{
    /// <summary>
    /// Gets the start date of the billing period containing the given date.
    /// </summary>
    public static DateTime GetPeriodStart(PaymentFrequency frequency, DateTime date)
    {
        return frequency switch
        {
            PaymentFrequency.None => date,
            PaymentFrequency.Weekly => GetWeekStart(date),
            PaymentFrequency.BiWeekly => GetBiWeeklyStart(date),
            PaymentFrequency.Monthly => GetMonthStart(date),
            PaymentFrequency.Quarterly => GetQuarterStart(date),
            PaymentFrequency.SemiAnnually => GetSemiAnnualStart(date),
            PaymentFrequency.Annually => new DateTime(date.Year, 1, 1),
            _ => date
        };
    }

    /// <summary>
    /// Gets the end date of the billing period containing the given date.
    /// The end date is the last moment before the next period starts.
    /// </summary>
    public static DateTime GetPeriodEnd(PaymentFrequency frequency, DateTime date)
    {
        if (frequency == PaymentFrequency.None)
            return date;

        var currentStart = GetPeriodStart(frequency, date);
        var nextStart = frequency switch
        {
            PaymentFrequency.Weekly => currentStart.AddDays(7),
            PaymentFrequency.BiWeekly => currentStart.AddDays(14),
            PaymentFrequency.Monthly => currentStart.AddMonths(1),
            PaymentFrequency.Quarterly => currentStart.AddMonths(3),
            PaymentFrequency.SemiAnnually => currentStart.AddMonths(6),
            PaymentFrequency.Annually => currentStart.AddYears(1),
            _ => currentStart
        };

        return nextStart - TimeSpan.FromTicks(1);
    }

    /// <summary>
    /// Normalizes a date to the start of its billing period.
    /// </summary>
    public static DateTime NormalizeDate(PaymentFrequency frequency, DateTime date)
    {
        return GetPeriodStart(frequency, date);
    }

    private static DateTime GetWeekStart(DateTime date)
    {
        // Week starts on Monday
        var daysToSubtract = (int)date.DayOfWeek - 1;
        if (daysToSubtract < 0)
            daysToSubtract = 6; // Sunday case
        return date.AddDays(-daysToSubtract).Date;
    }

    private static DateTime GetBiWeeklyStart(DateTime date)
    {
        // Calculate based on a reference epoch (2000-01-03 was a Monday)
        var epoch = new DateTime(2000, 1, 3);
        var daysSinceEpoch = (date.Date - epoch).Days;
        var biWeeklyOffset = daysSinceEpoch % 14;
        return date.AddDays(-biWeeklyOffset).Date;
    }

    private static DateTime GetMonthStart(DateTime date)
    {
        return new DateTime(date.Year, date.Month, 1);
    }

    private static DateTime GetQuarterStart(DateTime date)
    {
        var quarterMonth = ((date.Month - 1) / 3) * 3 + 1;
        return new DateTime(date.Year, quarterMonth, 1);
    }

    private static DateTime GetSemiAnnualStart(DateTime date)
    {
        var month = date.Month <= 6 ? 1 : 7;
        return new DateTime(date.Year, month, 1);
    }
}
