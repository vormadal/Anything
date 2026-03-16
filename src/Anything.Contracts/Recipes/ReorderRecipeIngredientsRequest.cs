using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recipes;

public record ReorderRecipeIngredientsRequest([Required] List<int> Ids);
