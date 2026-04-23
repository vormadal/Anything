using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.SuggestionCategories;

public record ImportSuggestionCategoriesRequest(
    [Required]
    List<SuggestionCategoryImportExportItem> Categories);
