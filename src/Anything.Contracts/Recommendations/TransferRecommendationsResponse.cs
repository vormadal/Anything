namespace Anything.Contracts.Recommendations;

/// <summary>
/// Outcome of a bulk transfer: how many suggestions were moved to the destination
/// scope, and how many were dropped because the destination already had a suggestion
/// with the same name.
/// </summary>
/// <param name="Moved">Number of suggestions reassigned to the destination scope.</param>
/// <param name="Dropped">Number of source suggestions removed as duplicates of an existing destination suggestion.</param>
public record TransferRecommendationsResponse(int Moved, int Dropped);
