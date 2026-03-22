using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.SuggestionCategories;

public record ReorderSuggestionCategoriesRequest(
    [Required] List<int> Ids);
