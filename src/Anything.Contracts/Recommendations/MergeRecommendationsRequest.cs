using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recommendations;

/// <summary>
/// Request to merge one or more near-duplicate suggestions into a single canonical one.
/// </summary>
/// <param name="TargetId">The suggestion to keep. Its scope (shared vs list) is preserved.</param>
/// <param name="SourceIds">The suggestions to merge into the target; each is deleted.</param>
/// <param name="Name">Optional canonical name for the kept suggestion. Defaults to the target's current name.</param>
/// <param name="CategoryId">Optional category to set on the kept suggestion.</param>
/// <param name="PreferredUnit">Optional preferred unit to set on the kept suggestion.</param>
/// <param name="IncludeInSuggestions">Optional autocomplete-visibility flag for the kept suggestion.</param>
public record MergeRecommendationsRequest(
    [Required]
    int TargetId,
    [Required(ErrorMessage = "At least one source suggestion is required.")]
    [MinLength(1, ErrorMessage = "At least one source suggestion is required.")]
    List<int> SourceIds,
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string? Name = null,
    int? CategoryId = null,
    [StringLength(50, ErrorMessage = "PreferredUnit must be at most 50 characters.")]
    string? PreferredUnit = null,
    bool? IncludeInSuggestions = null);
