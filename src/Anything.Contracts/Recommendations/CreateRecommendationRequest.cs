using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recommendations;

/// <summary>
/// Request to create a shopping-list recommendation.
/// </summary>
/// <param name="Name">The recommendation's display name.</param>
/// <param name="PreferredUnit">Optional preferred unit pre-filled when the item is added.</param>
/// <param name="ShoppingListId">
/// The list this suggestion belongs to. <c>null</c> makes it shared across every shopping list in
/// the household; a non-null value restricts it to that one list.
/// </param>
public record CreateRecommendationRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(50, ErrorMessage = "PreferredUnit must be at most 50 characters.")]
    string? PreferredUnit = null,
    int? ShoppingListId = null);
