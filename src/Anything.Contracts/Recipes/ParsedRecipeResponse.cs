namespace Anything.Contracts.Recipes;

public record ParsedIngredient(decimal? Amount, string? Unit, string Name);

public record ParsedStep(int Order, string Text);

public record ParsedRecipeResponse(string Name, string? Link, List<ParsedIngredient> Ingredients, List<ParsedStep> Steps, string? ImageUrl);
