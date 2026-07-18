namespace Anything.Application.Features.Recommendations.Commands;

internal static class RecommendationErrors
{
    internal const string NotFound = "Recommendation not found.";
    internal const string ListNotFound = "Shopping list not found.";
    internal const string MergeSourcesRequired = "At least one source suggestion is required to merge.";
    internal const string MergeTargetInSources = "The suggestion to keep cannot also be one of the merged suggestions.";
    internal const string MergeMembersNotFound = "One or more suggestions to merge were not found.";
    internal const string MergeNameConflict = "Another suggestion with the chosen name already exists for this list.";
    internal const string TransferSameScope = "The source and destination are the same — nothing to move.";
}
