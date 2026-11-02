using Anything.Contracts.Renovation;
using Anything.Core.Entities;

namespace Anything.Application.Features.Renovation;

public static class RenovationMapping
{
    public static RenovationLineResponse ToResponse(RenovationLine l, LineFigures f) => new(
        l.Id, l.RoomId, l.Label, l.Group, l.MaterialId, l.Description, l.Basis.ToString(), l.FixedQuantity,
        l.Unit, l.UnitPrice, l.WastePercent, l.SortOrder, l.IsComplete,
        f.RequiredQuantity, f.PurchasedQuantity, f.RemainingQuantity, f.Estimate, f.Actual, f.Forecast, f.Status);

    public static RenovationMaterialResponse ToResponse(RenovationMaterial m) => new(
        m.Id, m.Name, m.Category, m.Unit, m.DefaultPrice, m.WastePercent, m.PackSize, m.ProductUrl,
        m.CreatedOn, m.ModifiedOn);
}
