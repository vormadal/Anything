using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

/// <summary>
/// Raw recipe text (e.g. extracted from a photo via OCR) to be parsed into a structured recipe.
/// Ingredient and step lines are newline-separated.
/// </summary>
public record ParseRecipeTextRequest(
    [StringLength(200, ErrorMessage = "Name must be at most 200 characters.")]
    string? Name,
    [StringLength(10000, ErrorMessage = "IngredientsText must be at most 10000 characters.")]
    string? IngredientsText,
    [StringLength(20000, ErrorMessage = "StepsText must be at most 20000 characters.")]
    string? StepsText);
