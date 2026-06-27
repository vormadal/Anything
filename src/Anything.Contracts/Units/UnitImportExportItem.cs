using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Anything.Contracts.Units;

public record UnitImportExportItem(
    [Required]
    [StringLength(50, MinimumLength = 1)]
    string Name,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    bool Delete = false);
