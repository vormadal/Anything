namespace Anything.Core.Services;

/// <summary>
/// Remembers measurement units used across the current household so they can be
/// suggested later (autocomplete). Adds to the unit catalog if the unit is not
/// already known; the caller's unit of work is responsible for persisting.
/// </summary>
public interface IUnitCatalog
{
    Task EnsureUnit(string? name, CancellationToken ct = default);
}
