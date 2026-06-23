using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record CloneSharedRecipeRequest(
    [Required] int TargetHouseholdId
);
