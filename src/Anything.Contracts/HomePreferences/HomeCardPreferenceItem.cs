using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.HomePreferences;

public record HomeCardPreferenceItem(
    [Required] string CardKey,
    bool IsVisible = true);
