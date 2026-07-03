using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.HomePreferences;

public record UpdateHomeCardPreferencesRequest(
    [Required, MinLength(1)] List<HomeCardPreferenceItem> Cards);
