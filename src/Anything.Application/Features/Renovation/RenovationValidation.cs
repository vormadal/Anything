using Anything.Contracts.Renovation;
using Anything.Core.Entities;

namespace Anything.Application.Features.Renovation;

public static class RenovationValidation
{
    /// <summary>
    /// A product link is rendered as an anchor, so anything other than an absolute http(s) URL
    /// (<c>javascript:</c>, <c>data:</c>, relative paths) is refused rather than stored.
    /// </summary>
    public static bool IsValidProductUrl(string? url) =>
        string.IsNullOrWhiteSpace(url)
        || (Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));

    public static bool TryParseBasis(string value, out RenovationQuantityBasis basis) =>
        Enum.TryParse(value, ignoreCase: true, out basis) && Enum.IsDefined(basis);

    /// <summary>Returns an error message, or null when the line request is consistent.</summary>
    public static string? ValidateLine(SaveRenovationLineRequest request, out RenovationQuantityBasis basis)
    {
        if (!TryParseBasis(request.Basis, out basis))
            return $"Unknown basis '{request.Basis}'.";
        if (basis == RenovationQuantityBasis.Fixed && request.FixedQuantity is null)
            return "Fixed quantity is required when the basis is Fixed.";
        return null;
    }

    public static void Apply(RenovationLine line, SaveRenovationLineRequest request, RenovationQuantityBasis basis)
    {
        line.Label = request.Label.Trim();
        line.Group = request.Group.Trim();
        line.MaterialId = request.MaterialId;
        line.Description = request.Description.Trim();
        line.Basis = basis;
        line.FixedQuantity = basis == RenovationQuantityBasis.Fixed ? request.FixedQuantity : null;
        line.Unit = request.Unit.Trim();
        line.UnitPrice = request.UnitPrice;
        line.WastePercent = request.WastePercent;
        line.IsComplete = request.IsComplete;
    }
}
