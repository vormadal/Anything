using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Anything.Contracts.Recommendations;

public record RecommendationImportExportItem(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string Name,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [StringLength(50)]
    string? PreferredUnit = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [StringLength(200)]
    string? Category = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    bool Delete = false);
