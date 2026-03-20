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
        List<BillPriceHistory> priceHistories,
        List<Location> locations,
        List<Vendor> vendors)
    {
        var ordered = priceHistories
            .Where(ph => ph.BillId == bill.Id)
            .OrderByDescending(ph => ph.EffectiveDate)
            .ToList();

        var current = ordered.FirstOrDefault();
        var previous = ordered.Count > 1 ? ordered[1] : null;

        var location = bill.LocationId.HasValue
            ? locations.FirstOrDefault(l => l.Id == bill.LocationId)
            : null;
        var vendor = bill.VendorId.HasValue
            ? vendors.FirstOrDefault(v => v.Id == bill.VendorId)
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
            current?.Amount,
            ComputeMonthlyEquivalent(bill.Frequency, current?.Amount),
            priceIncreased,
            bill.CreatedOn,
            bill.ModifiedOn);
    }

    internal static bool TryParseFrequency(string value, out PaymentFrequency frequency)
        => Enum.TryParse(value, ignoreCase: true, out frequency);
}
