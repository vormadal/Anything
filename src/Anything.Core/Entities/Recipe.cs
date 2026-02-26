namespace Anything.Core.Entities;

public class Recipe
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Link { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }
}
