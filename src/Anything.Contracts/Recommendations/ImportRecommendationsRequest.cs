using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Recommendations;

public record ImportRecommendationsRequest(
    [Required]
    List<RecommendationImportExportItem> Recommendations);
