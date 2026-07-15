using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recommendations;

/// <summary>
/// Request to update a shopping-list recommendation.
/// </summary>
/// <param name="Name">The recommendation's display name.</param>
/// <param name="PreferredUnit">Optional preferred unit pre-filled when the item is added.</param>
/// <param name="CategoryId">Optional category used to sort matching items into the right section.</param>
/// <param name="IncludeInSuggestions">
/// Whether this recommendation appears in the add-box autocomplete suggestions. Recipe-seeded
/// names are hidden (false) so they can carry a category without cluttering suggestions; set true
/// to promote one back into suggestions.
/// </param>
public record UpdateRecommendationRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(50, ErrorMessage = "PreferredUnit must be at most 50 characters.")]
    string? PreferredUnit = null,
    int? CategoryId = null,
    bool IncludeInSuggestions = true);
