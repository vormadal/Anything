using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.SuggestionCategories;

public record SuggestionCategoryImportExportItem(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string Name);
