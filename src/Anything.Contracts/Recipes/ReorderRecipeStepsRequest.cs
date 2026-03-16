using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record ReorderRecipeStepsRequest([Required] List<int> Ids);
