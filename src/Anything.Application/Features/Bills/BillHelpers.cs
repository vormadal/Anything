using Anything.Contracts.Bills;
using Anything.Core.Entities;

namespace Anything.Application.Features.Bills;

internal static class BillHelpers
{
    internal static decimal? ComputeMonthlyEquivalent(PaymentFrequency frequency, decimal? amount)
    {
        if (amount is null) return null;
        return frequency switch
        {
            PaymentFrequency.None => null,
            PaymentFrequency.Weekly => Math.Round(amount.Value * 52m / 12m, 2),
            PaymentFrequency.BiWeekly => Math.Round(amount.Value * 26m / 12m, 2),
            PaymentFrequency.Monthly => amount.Value,
            PaymentFrequency.Quarterly => Math.Round(amount.Value / 3m, 2),
            PaymentFrequency.SemiAnnually => Math.Round(amount.Value / 6m, 2),
            PaymentFrequency.Annually => Math.Round(amount.Value / 12m, 2),
            _ => amount.Value
        };
    }

    internal static BillResponse ToBillResponse(
        Bill bill,
        ILookup<int, BillPriceHistory> priceHistoriesByBillId,
        Dictionary<int, Location> locationsById,
        Dictionary<int, Vendor> vendorsById)
    {
        var ordered = priceHistoriesByBillId[bill.Id]
            .OrderByDescending(ph => ph.EffectiveDate)
            .ToList();

        var current = ordered.FirstOrDefault();
        var previous = ordered.Count > 1 ? ordered[1] : null;

        var location = bill.LocationId.HasValue
            ? locationsById.GetValueOrDefault(bill.LocationId.Value)
            : null;
        var vendor = bill.VendorId.HasValue
            ? vendorsById.GetValueOrDefault(bill.VendorId.Value)
            : null;

        var priceIncreased = current is not null && previous is not null
            && current.Amount > previous.Amount;

        return new BillResponse(
            bill.Id,
            bill.Name,
            bill.VendorId,
            vendor?.Name,
            vendor?.Website,
            bill.Frequency.ToString(),
            bill.IsAutomated,
            bill.LocationId,
            location?.Name,
            bill.ManagementUrl,
            bill.Category,
            bill.Notes,
            bill.IsRecurring,
            current?.Amount,
            ComputeMonthlyEquivalent(bill.Frequency, current?.Amount),
            priceIncreased,
            bill.CreatedOn,
            bill.ModifiedOn);
    }

    internal static bool TryParseFrequency(string value, out PaymentFrequency frequency)
    {
        frequency = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var trimmed = value.TrimStart();
        if (trimmed.Length == 0 || char.IsDigit(trimmed[0]))
            return false;

        return Enum.TryParse(value, ignoreCase: true, out frequency)
            && Enum.IsDefined(frequency);
    }

    /// <summary>
    /// Two date ranges [a.Start, a.End) and [b.Start, b.End) overlap when
    /// a.Start &lt; b.End and b.Start &lt; a.End. An open-ended range (EndDate == null)
    /// is treated as extending to <see cref="DateTime.MaxValue"/> for this comparison.
    /// </summary>
    internal static bool IsOverlappingPriceRange(DateTime effectiveDate, DateTime? endDate, List<BillPriceHistory> existing)
    {
        foreach (var entry in existing)
        {
            var existingEnd = entry.EndDate ?? DateTime.MaxValue;
            var newEnd = endDate ?? DateTime.MaxValue;

            if (effectiveDate < existingEnd && newEnd > entry.EffectiveDate)
                return true;
        }

        return false;
    }
}
