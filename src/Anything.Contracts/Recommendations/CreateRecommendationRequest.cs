using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recommendations;

public record CreateRecommendationRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(50, ErrorMessage = "PreferredUnit must be at most 50 characters.")]
    string? PreferredUnit = null);
