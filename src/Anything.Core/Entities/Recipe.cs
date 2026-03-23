namespace Anything.Core.Entities;

public class Recipe
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Link { get; set; }
    public string? Notes { get; set; }
    public int? CookTimeMinutes { get; set; }
    public int? Servings { get; set; }
    public ServingsType ServingsType { get; set; } = ServingsType.People;
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
