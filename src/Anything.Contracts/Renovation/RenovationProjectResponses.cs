namespace Anything.Contracts.Renovation;

/// <summary>
/// Totals shared by a project and each room. <c>Forecast</c> is what the work is expected to cost
/// now: what has been paid, plus the estimate for every quantity not yet bought.
/// </summary>
public record RenovationProjectSummaryResponse(
    int Id,
    string Name,
    decimal? Budget,
    int RoomCount,
    decimal Estimate,
    decimal Actual,
    decimal Forecast,
    DateTime CreatedOn,
    DateTime? ModifiedOn);

public record RenovationProjectResponse(
    int Id,
    string Name,
    decimal? Budget,
    string? Notes,
    decimal Estimate,
    decimal Actual,
    decimal Forecast,
    List<RenovationRoomResponse> Rooms,
    DateTime CreatedOn,
    DateTime? ModifiedOn);

public record RenovationRoomResponse(
    int Id,
    string Name,
    string RoomType,
    decimal Length,
    decimal Width,
    decimal Height,
    int Doors,
    int Windows,
    int SortOrder,
    decimal FloorArea,
    decimal WallArea,
    decimal Perimeter,
    decimal Estimate,
    decimal Actual,
    decimal Forecast,
    List<RenovationLineResponse> Lines);

/// <param name="Status">NotStarted, Partial or Complete.</param>
/// <param name="RequiredQuantity">Quantity from the room's size (or the fixed quantity), including waste.</param>
/// <param name="Estimate">RequiredQuantity × UnitPrice.</param>
/// <param name="Forecast">Actual + RemainingQuantity × UnitPrice, or just Actual once the line is complete.</param>
public record RenovationLineResponse(
    int Id,
    int RoomId,
    string Label,
    string Group,
    int? MaterialId,
    string Description,
    string Basis,
    decimal? FixedQuantity,
    string Unit,
    decimal UnitPrice,
    decimal WastePercent,
    int SortOrder,
    bool IsComplete,
    decimal RequiredQuantity,
    decimal PurchasedQuantity,
    decimal RemainingQuantity,
    decimal Estimate,
    decimal Actual,
    decimal Forecast,
    string Status);

/// <summary>
/// A room type as this household sees it: a built-in, the household's override of one, or a
/// household-defined type. Editing (PUT/DELETE) is limited to household managers; the UI should
/// offer "Reset to default" when <paramref name="IsCustomised"/> and "Delete" when not <paramref name="IsBuiltIn"/>.
/// </summary>
/// <param name="IsCustomised">The household has its own version of this built-in room type.</param>
/// <param name="IsBuiltIn">A built-in room type exists for this key. False for household-defined room types.</param>
public record RenovationRoomTemplateResponse(
    string RoomType,
    string Label,
    decimal Length,
    decimal Width,
    decimal Height,
    int Doors,
    int Windows,
    List<RenovationTemplateLineResponse> Lines,
    bool IsCustomised,
    bool IsBuiltIn);

/// <param name="Key">Stable key, used in <c>CreateRenovationRoomRequest.LineKeys</c>.</param>
public record RenovationTemplateLineResponse(
    string Key,
    string Label,
    string Group,
    string MaterialName,
    string Category,
    string Basis,
    string Unit,
    decimal DefaultPrice,
    decimal WastePercent,
    decimal? FixedQuantity,
    bool EnabledByDefault);
