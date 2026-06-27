using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Units;

public record ImportUnitsRequest(
    [Required]
    List<UnitImportExportItem> Units);
